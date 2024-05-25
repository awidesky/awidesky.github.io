
function findGithubFile(repo, branch, file, callback)
{
    //404 errors in browser are not hideable.
    //see : https://stackoverflow.com/questions/44019776/fetch-api-chrome-and-404-errors
    fetch("https://raw.githubusercontent.com/awidesky/" + repo + "/" + branch + "/" + file)
    .then(function(response) {
        if(response.ok) {
            response.text().then((t) => {
                callback(t);
                alert(response.header.get("content-type"));
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


function addComponents(repos, parent_div) {
    //downloadObjectAsJson(repos, "repos")
    repos.sort(function(a, b) {
        if(a['fork'] == b['fork']) {
            //both of them are forked, or not forked
            const da = new Date(a['updated_at']);
            const db = new Date(b['updated_at']);
            return da < db ? 1 : (da > db ? -1 : 0);
        } else {
            //one of them is forked, the other is not.
            //the one which is not forked(my own repo)
            //should be listed first.
            return a['fork'] == 'false' ? -1 : 1; //요게 문자열이 아니여야?
        }
    });
    for (let i in repos) {
        const div = document.createElement("div");
        if(repos[i]['visibility'] !='public') continue;
        
        const repoLink = document.createElement("a");
        repoLink.href = repos[i]['html_url'];
        repoLink.innerHTML = "<b>" + repos[i]['name'] + "</b>";
        
        const license = document.createElement("p");
        license.textContent = repos[i]['license']
        license.classList.add("tag");
        license.classList.add("license");
        
        const lang = document.createElement("p");
        lang.textContent = repos[i]['language']
        lang.classList.add("tag");
        lang.classList.add("lang");
        
        const title = document.createElement("div");
        title.appendChild(repoLink);
        title.appendChild(license);
        title.appendChild(lang);
        title.classList.add("title");
        div.appendChild(title);
        
        const releaseLink = document.createElement("a");
        releaseLink.href = repos[i]['html_url'] + "/releases";
        releaseLink.textContent = "release";
        
        const desc = document.createElement("p");
        desc.textContent = repos[i]['description']
        desc.classList.add("desc");
        
        
        //div.appendChild(document.createElement("br"))
        if(repos[i]['description'] != "") div.appendChild(desc)
            div.appendChild(releaseLink);
        
        div.classList.add("repo");
        
        //release 버튼
        //license
        //language
        //b['fork']한건지도 표시
        //updated ~ ago
        /*
         { //myrepos.json
         "release": false,
         "mavenLib": true, //pom 찾을필요 없이
         }
         */
        
        
        function addMavenDiv(pom) {
            //check if it's deployed to maven central or not
            if(!pom.includes("<artifactId>nexus-staging-maven-plugin</artifactId>")) return;
            
            //denote that it's a maven library project
            const mavenCentral = "https://central.sonatype.com/artifact/io.github.awidesky/" + repos[i]['name'] + "/";
            $.getJSON(mavenCentral, (mavenResp) => {
                downloadObjectAsJson(mavenResp)
                if(true) {
                    const btn = document.createElement("button")
                    btn.onclick = function() { window.open(mavenCentral) };
                    btn.textContent = "see in maven central";
                    div.appendChild(btn);
                };
            });
        }
        findGithubFile(repos[i]['name'], repos[i]['default_branch'], "pom.xml", addMavenDiv);
        
        //download 버튼
        //license
        
        parent_div.appendChild(div);
    }
}
