
let TODOUpdateTime = new Date((localStorage.getItem("TODOUpdateTime") === undefined) ? "2000-01-01T01:00:00Z" : localStorage.getItem("TODOUpdateTime"));
const TODOQuery = "TODO :";
function TODO(repos) {
    let TODOList = [];
    let promiseList = [];
    const now = new Date();
    localStorage.setItem("TODOUpdateTime", now.toString());
    const parentDiv = document.getElementById("TODOs");
    repos.forEach((repo) => {
        const pushedAt = new Date(repo.pushed_at);
        const monthDiff = now.getMonth() - pushedAt.getMonth() + (12 * (now.getFullYear() - pushedAt.getFullYear()));
        //if (pushedAt <= TODOUpdateTime || monthDiff > 12) return;
        //promiseList.push(
        $.getJSON("https://api.github.com/repos/awidesky/" + repo['name'] + "/git/trees/" + repo['latest_branch'] + "?recursive=1", (files, tm, jqXHR) => {
            console.log("Request remaining : " + jqXHR.getResponseHeader("x-ratelimit-remaining"));
            files = files.tree.filter((f) => f.type == "blob"); //only check "blob"(file), not "tree"(directory).
            if(files.length == 0) return;
            const div = document.createElement("div");
            div.classList.add("TODOdiv");
            const title = document.createElement("h2");
            title.textContent = repo['name']; //a(repo link) 안에 들은 h3로 바꾸기
            div.appendChild(title);
            for (let idx in files) {
                findGithubFile(repo['name'], repo['latest_branch'], files[idx].path, (raw) => {
                    let list = [];
                    let i = 0;
                    let obj = {
                        path: files[idx].path
                    };
                    let todos = raw.split('\n')
                        .forEach((s) => {
                            i++;

                            if (/(TODO) :/.test(s) != s.includes(TODOQuery)) {
                                alert(s);
                            }
                            if (s.includes(TODOQuery)) {
                                s = s.substr(s.indexOf(TODOQuery));
                                obj.line = i;
                                obj.str = s;
                                obj.link = "https://github.com/awidesky/" + repo['name'] + "/blob/" + obj.branch + "/" + obj.path + "#L" + obj.line;
                                list.push(obj);
                            }
                        });

                    if (list.length > 0) {
                        /*
                        console.log("In " + repo['name']);
                        //list = list.map((obj) => "https://github.com/awidesky/" + obj.repo + "/blob/" + obj.branch + "/" + obj.path + "#L" + obj.line);
                        
                        list.forEach((obj) => {
                            console.log(obj);
                            //console.log("\t" + obj.path + " " + obj.line + " : " + obj.str);
                        });
                        */
                        TODOList.push({ 'name': repo['name'], 'list': list });
                        const p = document.createElement("p");
                        p.classList.add("TODO");
                        p.textContent = JSON.stringify(list);
                        div.appendChild(p);
                        parentDiv.appendChild(div);
                        //console.log(JSON.stringify(list));
                    }
                });
            };
        }).fail(getGithubApiFail(window.location));
    //);
    });

    //console.log(JSON.stringify(TODOList));
    //downloadObjectAsJson(TODOList, "TODOList");
    
}