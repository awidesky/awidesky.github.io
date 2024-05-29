
function findGithubFile(repo, branch, file, callback) {
    /*
     Fetch file's content if exist.
     Even though it does not exist, that's not a problem.
     But we cannot suppress 404 error logs in browser.
     see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    */
    fetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
        .then(function (response) {
            if (response.ok) {
                //alert(response.header.get("content-type"));
                response.text().then((t) => {
                    callback(t);
                });
            }
        });
}

function downloadObjectAsJson(exportObj, exportName) {
    //for debug
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
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


function getRepoDiv(repo) {
    const div = document.createElement("div");
    div.classList.add("repo");

    const title = document.createElement("div");
    const repoLink = document.createElement("a");
    repoLink.href = repo['html_url'];
    repoLink.innerHTML = "<b>" + repo['name'] + "</b>";
    repoLink.classList.add("tag");
    repoLink.classList.add("repoLink");
    title.appendChild(repoLink);

    const li = repo['license'];
    if (li != null && li.name != "Other") {
        const license = document.createElement("a");
        license.href = 'javascript:void(0);';
        license.onclick = () => {
            $.getJSON(li.url, (data) => {
                window.location.href = data.html_url;
            });
        };
        license.textContent = li.spdx_id;
        license.title = li.name;
        license.classList.add("tag");
        license.classList.add("plainLink");
        license.classList.add("license");
        title.appendChild(license);
    }

    if (repo['language'] != null) {
        const lang = document.createElement("p");
        lang.textContent = repo['language'];
        lang.classList.add("tag");
        lang.classList.add("lang");
        title.appendChild(lang);
    }

    title.classList.add("title");
    div.appendChild(title);


    if (repo['description'] != "") {
        const desc = document.createElement("p");
        desc.textContent = repo['description']
        desc.classList.add("desc");
        div.appendChild(desc);
    }

    const releaseLink = document.createElement("a");
    releaseLink.href = repo['html_url'] + "/releases";
    releaseLink.textContent = "release";
    div.appendChild(releaseLink);

    const updatedAt = document.createElement("p");
    updatedAt.textContent = getDateDiff(repo['updated_at'], repo['pushed_at']);
    updatedAt.classList.add("tag");
    updatedAt.classList.add("updatedAt");
    div.appendChild(updatedAt);

    //release 버튼
    //json crwaling 만든 시점을 기준으로 그 이후에 업데이트되지 않은 레포는 다 넘기고.. 나머지만 긁어오기
    /*
     { //myrepos.json
     "release": false,
     "mavenLib": true, //pom 찾을필요 없이
     "dev_branch": "dev", // master 말고, 개발 브랜치
     }
     */

    return div;
}

function readProjectJson(repo, div) {

    function addMavenDiv(pom) {
        //check if it's deployed to maven central or not
        if (!pom.includes("<artifactId>nexus-staging-maven-plugin</artifactId>")) return;

        //denote that it's a maven library project
        const mavenCentral = "https://central.sonatype.com/artifact/io.github.awidesky/" + repo['name'];
        if (true) {
            const btn = document.createElement("button")
            btn.onclick = function () { window.open(mavenCentral) };
            btn.textContent = "see in maven central";
            div.appendChild(btn);
        };
    }
    if (!repo.fork) findGithubFile(repo['name'], repo['default_branch'], "pom.xml", addMavenDiv);

}
