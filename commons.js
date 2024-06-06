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

function getGithubAPI(query, callback) {
    return $.getJSON('https://api.github.com/users/awidesky/' + query, callback)
            .fail(getGithubApiFail(window.location));
}

function findGithubFile(repo, branch, file, callback) {
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
                return Promise.resolve("");
            }
        })
        .then((t) => callback(t));
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

