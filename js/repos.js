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

    if (repo['language'] != null) {
        const lang = document.createElement("p");
        lang.textContent = repo['language'];
        lang.classList.add("tag");
        lang.classList.add("lang");
        title.appendChild(lang);
    }

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

    title.classList.add("title");
    div.appendChild(title);


    if (repo['description'] != "") {
        const desc = document.createElement("p");
        desc.textContent = repo['description']
        desc.classList.add("desc");
        div.appendChild(desc);
    }

    const updatedAt = document.createElement("p");
    updatedAt.textContent = getDateDiff(repo['updated_at'], repo['pushed_at']);
    updatedAt.classList.add("tag");
    updatedAt.classList.add("updatedAt");
    div.appendChild(updatedAt);

    
    /* Example of myproject.json
     {
        "release": false,
        "mavenLib": true,
        "dev_branch": "dev"
     }
     */

    if (repo["mavenLib"]) {
        //denote that it's a maven library project
        const mavenCentral = "https://central.sonatype.com/artifact/io.github.awidesky/" + repo['name'];
        const btn = document.createElement("button")
        btn.onclick = function () { window.open(mavenCentral) };
        btn.textContent = "see in maven central";
        div.appendChild(btn);
    };

    if (repo["release"]) {
        const releaseLink = document.createElement("a");
        releaseLink.href = repo['html_url'] + "/releases";
        releaseLink.textContent = "release";
        div.appendChild(releaseLink);
    }

    return div;
}
