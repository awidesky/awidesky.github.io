function getGithubApiFail(redirectLocation) {
    return (xhr) => {
        if (xhr["responseText"].includes("API rate limit")) {
            localStorage.setItem("redirectLocation", redirectLocation);
            window.location.href = 'api_limit.html';
        } else {
            alert(JSON.stringify(xhr, null, 4));
        }
    }
}

function getGithubAPI(query, callback = (d) => d) {
    return $.getJSON('https://api.github.com/' + query, (d, s, jqXHR) => {
                localStorage.setItem("x-ratelimit-remaining", jqXHR.getResponseHeader("x-ratelimit-remaining"));
                localStorage.setItem("x-ratelimit-limit", jqXHR.getResponseHeader("x-ratelimit-limit"));
                localStorage.setItem("x-ratelimit-reset", jqXHR.getResponseHeader("x-ratelimit-reset"));
                return d;
            })
            .then(callback)
            .fail(getGithubApiFail(window.location));
}

function findGithubFile(repo, branch, file, callback = (t) => t) {
    /*
     Fetch file's content if exist.
     Even though it does not exist, that's not a problem.
     But we cannot suppress 404 error logs in browser.
     see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    */
    return fetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
        .then((response) => {
            if (response.ok) {
                //alert(response.header.get("content-type"));
                return response.text();
            } else {
                return Promise.resolve(null);
            }
        })
        .then((t) => callback(t));
}

function getRepositories(callback) {
    getGithubAPI("users/awidesky", user => {
        let r_num = user.public_repos;
        var promises = [];
        let i = 1;
        while(r_num > 0) {
            promises.push(getGithubAPI('users/awidesky/repos?per_page=100&page=' + i));
            i++;
            r_num -= 100;
        }

        $.when.apply($, promises).then(function(data) {
            data = [].concat(...data)
            const comp = (r1, r2) => {
                d1 = new Date(r1.pushed_at);
                d2 = new Date(r2.pushed_at);
                return d1 < d2 ? 1 : (d1 > d2 ? -1 : 0);
            }
            const not_forked = data.filter(d => !d.fork);
            not_forked.sort(comp);
            //여기서 readProjectJson
            not_forked.forEach(repo => readProjectJson(repo));
            const forked = data.filter(d => d.fork);
            forked.sort(comp);

            callback(not_forked, forked);
        });
    });
}

function readProjectJson(repo) {
    //if the last date that the repo is updated is before "myproject.json" was a thing, skip, obviously.
    if (new Date(repo.pushed_at) < new Date("Sun Jun 09 2024 00:00:00 GMT+0900")) return;

    repo['dev_branch'] = repo['default_branch'];
    function findLatestMyproject(mpjson) { //find myproject.json in latest dev branch, and process it.
        if(mpjson == null) return;
        mpjson = JSON.parse(mpjson);
        if (repo['dev_branch'] != mpjson.dev_branch) {
            repo['dev_branch'] = mpjson.dev_branch;
            findGithubFile(repo['name'], repo['dev_branch'], "myproject.json", findLatestMyproject);
            return;
        }
        for(let idx in mpjson) repo[idx] = mpjson[idx];
    }

    findGithubFile(repo['name'], repo['dev_branch'], "myproject.json", findLatestMyproject);

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
