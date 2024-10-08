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

function findGithubFile(repo, branch, file, callback = (t) => t, failCallback = () => Promise.resolve(null)) {
    /*
     Fetch file's content if exist.
     Even though it does not exist, that's not a problem.
     But we cannot suppress 404 error logs in browser.
     see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    */
    return fetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                return Promise.resolve(null);
            }
        })
        .catch(failCallback)
        .then(callback);
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
            
            return $.when.apply($, not_forked.map(repo => readProjectJson(repo)))
                         .then(() => { callback(not_forked.filter(r => !r.hide), forked); });
        });
    });
}


/* Example of myproject.json
 {
    "release": false,
    "mavenLib": true,
    "dev_branch": "dev",
    "hide": false
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
