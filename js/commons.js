function checkIfRequestFailed(redirectLocation, failCallback = undefined) {
    return (response) => {
        if(response.ok) return response.json();
        else return response.json().then(msg => {
            if (msg.message.includes("API rate limit")) {
                localStorage.setItem("redirectLocation", redirectLocation);
                window.location.href = 'api_limit.html';
            } else {
                const str = "Failed to fetch : " + response.url + "\nResponse(" + response.status + ") :\n" + JSON.stringify(msg, null, 4);
                console.log(str);
                console.trace();
                alert(str);
                if(failCallback != undefined) {
                    return failCallback();
                }
            }
        });
    }
}

function getGithubAPI(query, callback = (d) => d, failCallback = undefined) {
    const url = 'https://api.github.com/' + query;
    return fetch(url)
            .then((response) => {
                localStorage.setItem("x-ratelimit-remaining", response.headers.get("x-ratelimit-remaining"));
                localStorage.setItem("x-ratelimit-limit", response.headers.get("x-ratelimit-limit"));
                localStorage.setItem("x-ratelimit-reset", response.headers.get("x-ratelimit-reset"));
                return response;
            })
            .then(checkIfRequestFailed(window.location, failCallback))
            .then(callback);
}

/*
 raw.githubusercontent.com has its own per-IP limit(causing HTTP 429 "Too many requests"),
 separate from the api.github.com REST limit. To avoid a burst of parallel raw fetches
 tripping that throttle, all raw fetches go through a shared concurrency-limited pool
 with exponential-backoff retries.
*/
let rawFetchQueue = [];
let rawFetchActive = 0;
const RAW_FETCH_CONCURRENCY = 8;
const RAW_FETCH_MAX_RETRIES = 3;
const RAW_FETCH_BACKOFF_CAP_MS = 30000;

// fetch with exponential backoff on 429/5xx. Keeps the pool slot held during backoff,
// so retries act as natural backpressure on the throttled domain.
function fetchWithRetry(url) {
    let attempt = 0;
    return new Promise((resolve, reject) => {
        const tryFetch = () => {
            fetch(url).then((response) => {
                if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
                    if (attempt < RAW_FETCH_MAX_RETRIES) {
                        attempt++;
                        const delay = Math.min(1000 * Math.pow(2, attempt), RAW_FETCH_BACKOFF_CAP_MS);
                        setTimeout(tryFetch, delay);
                    } else {
                        console.warn("raw.githubusercontent.com still " + response.status + " after " + RAW_FETCH_MAX_RETRIES + " retries, skipping : " + url);
                        resolve(response);
                    }
                } else {
                    resolve(response);
                }
            }).catch(reject);
        };
        tryFetch();
    });
}

// Caller-facing entry point of the pool. It does not fetch immediately,
// it enqueues a task (with the caller's resolve/reject) and then asks
// pumpRawFetchQueue() to start it if a slot is free. The returned Promise
// resolves/rejects only when the task actually runs.
function throttledRawFetch(url) {
    return new Promise((resolve, reject) => {
        rawFetchQueue.push({ url, resolve, reject });
        pumpRawFetchQueue();
    });
}

// The pool scheduler. Runs whenever a slot frees up (or a task is enqueued):
// while there is capacity (rawFetchActive < RAW_FETCH_CONCURRENCY) AND work
// waiting (rawFetchQueue not empty), it pulls the next task off the FIFO queue,
// reserves a slot, and kicks off fetchWithRetry() for it. When that fetch
// finishes (resolve/reject/null), it releases the slot and calls itself again
// to fill the vacancy — so at most RAW_FETCH_CONCURRENCY fetches are ever in flight.
function pumpRawFetchQueue() {
    while (rawFetchActive < RAW_FETCH_CONCURRENCY && rawFetchQueue.length > 0) {
        const task = rawFetchQueue.shift();
        rawFetchActive++;
        fetchWithRetry(task.url)
            .then(task.resolve)
            .catch(() => task.resolve(null))
            .finally(() => {
                rawFetchActive--;
                pumpRawFetchQueue();
            });
    }
}

function findGithubFile(repo, branch, file, callback = (t) => t, failCallback = () => Promise.resolve(null)) {
    /*
     Fetch file's content if exist.
     Even though it does not exist, that's not a problem.
     But we cannot suppress 404 error logs in browser.
     see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    */
    return throttledRawFetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
        .then((response) => {
            if (response != null && response.ok) {
                return response.text();
            } else {
                return Promise.resolve(null);
            }
        })
        .catch(failCallback)
        .then(callback);
}

// Shared helper to show "Loading... (done/total repos)" progress. Both repos.html and TODO.html
// use identical <div id="loading"><h1><i>Loading...</i></h1></div> markup, so one writer works for both.
function setLoadingProgress(done, total) {
    const el = document.querySelector("#loading h1 i");
    if (el != null) el.textContent = "Loading... (" + done + "/" + total + ")";
}

function getRepositories(callback) {
    return getGithubAPI("users/awidesky", user => {
        let r_num = user.public_repos;
        var promises = [];
        let i = 1;
        while(r_num > 0) {
            promises.push(getGithubAPI('users/awidesky/repos?per_page=100&page=' + i));
            i++;
            r_num -= 100;
        }

        return $.when.apply($, promises).then(data => {
            data = [].concat(...data)
            const comp = (r1, r2) => {
                d1 = new Date(r1.pushed_at);
                d2 = new Date(r2.pushed_at);
                return d1 < d2 ? 1 : (d1 > d2 ? -1 : 0);
            }
            const not_forked = data.filter(d => !d.fork);
            not_forked.sort(comp);
            const forked = data.filter(d => d.fork);
            forked.sort(comp);
            
            // Count each repo as it finishes loading its myproject.json (via the raw fetch pool).
            let loaded = 0;
            return $.when.apply($, not_forked.map(repo => readProjectJson(repo).then(r => {
                setLoadingProgress(++loaded, not_forked.length);
                return r;
            })))
            .then(() => { callback(not_forked.filter(r => !r.hide), forked); });
        });
    });
}


/* myproject.json — optional per-repo config, read from the repo's dev branch.
   All fields are optional; only the ones present are applied onto the repo object.

   {
       "release":    false,   // bool : show a "release" button linking to <repo>/releases (repos.js)
       "mavenLib":   true,    // bool : show a "see in maven central" button (repos.js)
       "dev_branch": "dev",   // str  : branch this file is read from, and the branch TODO.js scans.
                              //        default = repo's default branch. If it differs from the
                              //        current dev_branch, the file is re-read from the new one.
       "hide":       false,   // bool : exclude the repo from repos.html AND from the TODO scan
                              //        (getRepositories filters it out before the callback).
       "TODOregex":  "TODO_"  // str  : custom regex for the TODO scan (TODO.js).
                              //        default = /TODO\s*:/
   }
 */
function readProjectJson(repo) {
    //set default value of dev_branch property
    repo['dev_branch'] = repo['default_branch'];

    //if the last date that the repo is updated is before "myproject.json" was a thing, skip, obviously.
    if (new Date(repo.pushed_at) < new Date("Sun Jun 09 2024 00:00:00 GMT+0900")) {
        /*
        Here I use a temporary hardcoded list repository names that are maven projects, but not contains myproject.json yet.
        For now, only "GUIUtil" does not have one, because it is currently under heavy refactoring.
        After refactoring project & adding myproject.json, this temporary logic can be deleted.
        TODO : remove this after adding myproject.json in GUIUtil
        Note - check that TODO line out in https://awidesky.github.io/TODO.html
         */
        const mavenrepolist = ["GUIUtil"];
        if(mavenrepolist.find(m => repo['name'] == m) == undefined) return Promise.resolve(null);

        //even though there are no myproject.json, check for .pom files just in case.
        return findGithubFile(repo['name'], repo['default_branch'], "pom.xml", pom => {
            //check if it's deployed to maven central or not
            repo["mavenLib"] = pom != null && pom.includes("<artifactId>nexus-staging-maven-plugin</artifactId>");
        });
    }

    function findLatestMyproject(mpjson) { //find myproject.json in latest dev branch, and process it.
        if(mpjson == null) return Promise.resolve(null);
        mpjson = JSON.parse(mpjson);
        if (Object.hasOwn(mpjson, 'dev_branch') && repo['dev_branch'] != mpjson.dev_branch) {
            repo['dev_branch'] = mpjson.dev_branch;
            return findGithubFile(repo['name'], repo['dev_branch'], "myproject.json", findLatestMyproject);
        }
        for(let idx in mpjson) repo[idx] = mpjson[idx];

        return Promise.resolve(repo); //return a valid value, but it's not used(see getRepositories()).
    }

    return findGithubFile(repo['name'], repo['dev_branch'], "myproject.json", findLatestMyproject);
}


function downloadObjectAsJson(exportObj, exportName) {
    //for debug
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 4));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function getDateDiff(updatedAt, pushedAt) {
    const u = updatedAt > pushedAt ? updatedAt : pushedAt;
    const diff = new Date(new Date().getTime() - new Date(u).getTime());
    const year = diff.getUTCFullYear() - 1970;
    const month = diff.getUTCMonth();
    const date = diff.getUTCDate() - 1;
    const hours = diff.getUTCHours();
    const mins = diff.getUTCMinutes();
    let ret = "updated ";
    if (year > 0) {
        ret += year + "years ago";
    } else if (month > 0) {
        ret += month + "months ago";
    } else if (date > 0) {
        ret += date + "days ago";
    } else if (hours > 0) {
        ret += hours + "hours ago";
    } else if (mins > 0) {
        ret += mins + "minutes ago";
    } else {
        ret += diff.getUTCSeconds() + "seconds ago";
    }
    return ret;
}
