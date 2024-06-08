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
