
let TODOUpdateTime = new Date((localStorage.getItem("TODOUpdateTime") === undefined) ? "2000-01-01T01:00:00Z" : localStorage.getItem("TODOUpdateTime"));
let TODOList = [];
function TODO(repos) {
    //let promiseList = [];
    const TODORegex = /(TODO) :/;
    const now = new Date();
    localStorage.setItem("TODOUpdateTime", now.toString());
    const parentDiv = document.getElementById("TODOs");
    repos.forEach((repo) => {
        const pushedAt = new Date(repo.pushed_at);
        const monthDiff = now.getMonth() - pushedAt.getMonth() + (12 * (now.getFullYear() - pushedAt.getFullYear()));
        //if (pushedAt <= TODOUpdateTime || monthDiff > 12) return;
        //promiseList.push(
        $.getJSON("https://api.github.com/repos/awidesky/" + repo['name'] + "/git/trees/" + repo['latest_branch'] + "?recursive=1", (files) => {
            //console.log("Request remaining : " + jqXHR.getResponseHeader("x-ratelimit-remaining"));
            files = files.tree.filter((f) => f.type == "blob"); //only check "blob"(file), not "tree"(directory).
            if(files.length == 0) return;
            const div = document.createElement("div");
            div.classList.add("TODOdiv");
            const title = document.createElement("a");
            title.href = repo['html_url'];
            title.innerHTML = "<h2>" + repo['name'] + "</h2>";
            div.appendChild(title);
            const ul = document.createElement("ul");
            div.appendChild(ul);
            parentDiv.appendChild(div);
            files.forEach((f) => {
                findGithubFile(repo['name'], repo['latest_branch'], f.path, (raw) => {
                    let list = [];
                    let i = 0;
                    let obj = {
                        filename: f.path.substr(f.path.lastIndexOf("/") + 1)
                    };
                    let todos = raw.split('\n')
                        .forEach((s) => {
                            i++;
                            //if (/(TODO) :/.test(s) != s.includes("TODO :")) alert(s);
                            if (TODORegex.test(s)) {
                                s = s.substr(s.search(TODORegex));
                                obj.line = i;
                                obj.str = s;
                                obj.link = "https://github.com/awidesky/" + repo['name'] + "/blob/" + repo['latest_branch'] + "/" + f.path + "#L" + obj.line;
                                list.push(obj);
                            }
                        });

                    if(list.length == 0) return;

                    list.forEach((l) => {
                        TODOList.push({ 'name': repo['name'], 'list': list });

                        const li = document.createElement("li");
                        const a = document.createElement("a");
                        a.href = l.link;
                        a.textContent = "line " + l.line + " of " + l.filename;
                        li.appendChild(a);
                        const p = document.createElement("p");
                        p.textContent = l.str;
                        //아니면 li.innerHTML += l.str;
                        li.appendChild(p);
                        ul.appendChild(li);
                        console.log(a);
                        console.log(p);
                        console.log(li);
                        console.log(ul);
                    });
                });
            });
        }).fail(getGithubApiFail(window.location));
    //);
    });

    //console.log(JSON.stringify(TODOList));
    //downloadObjectAsJson(TODOList, "TODOList");
    
}