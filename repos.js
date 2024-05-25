
function findGithubFile(repo, branch, file, callback)
{
    //404 errors in browser are not hideable.
    //see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    fetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
    .then(function(response) {
        if(response.ok) {
            //alert(response.header.get("content-type"));
            response.text().then((t) => {
                callback(t);
            });
        }
    });
}

function urlExists(url, callback) {
    $.ajax({
        type: 'HEAD',
        url: url,
        dataType:"jsonp",
        timeout: "1000",
        crossDomain: true,
        xhrFields: { // this option
            withCredentials: true,
        },
        statusCode: {
            200: function () {
                callback();
            }
        }
    });
}
function downloadObjectAsJson(exportObj, exportName){
    //for debug
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}


function getRepoDiv(repo) {
    const div = document.createElement("div");
    
    const title = document.createElement("div");
    const repoLink = document.createElement("a");
    repoLink.href = repo['html_url'];
    repoLink.innerHTML = "<b>" + repo['name'] + "</b>";
    repoLink.classList.add("tag");
    repoLink.classList.add("repoLink");
    title.appendChild(repoLink);
    
    const li = repo['license'];
    if(li != null && li.name != "Other") {
        const license = document.createElement("a");
        license.href = 'javascript:void(0);';
        license.onclick = function redirectLicenseInfo() {
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
    
    if(repo['language'] != null) {
        const lang = document.createElement("p");
        lang.textContent = repo['language'];
        lang.classList.add("tag");
        lang.classList.add("lang");
        title.appendChild(lang);
    }
    
    title.classList.add("title");
    div.appendChild(title);
    
    const releaseLink = document.createElement("a");
    releaseLink.href = repo['html_url'] + "/releases";
    releaseLink.textContent = "release";
    
    const desc = document.createElement("p");
    desc.textContent = repo['description']
    desc.classList.add("desc");
    
    
    //div.appendChild(document.createElement("br"))
    if(repo['description'] != "") div.appendChild(desc)
        div.appendChild(releaseLink);
    
    div.classList.add("repo");
    
    //release 버튼
    //updated ~ ago
    /*
     { //myrepos.json
     "release": false,
     "mavenLib": true, //pom 찾을필요 없이
     }
     */
    
    return div;
}

function readProjectJson(repo, div) {
    
    function addMavenDiv(pom) {
        //check if it's deployed to maven central or not
        if(!pom.includes("<artifactId>nexus-staging-maven-plugin</artifactId>")) return;
        
        //denote that it's a maven library project
        const mavenCentral = "https://central.sonatype.com/artifact/io.github.awidesky/" + repo['name'] + "/";
        if(true) {
            const btn = document.createElement("button")
            btn.onclick = function() { window.open(mavenCentral) };
            btn.textContent = "see in maven central";
            div.appendChild(btn);
        };
    }
    if(!repo.fork) findGithubFile(repo['name'], repo['default_branch'], "pom.xml", addMavenDiv);
    
}
