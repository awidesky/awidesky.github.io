
let TODOUpdateTime = new Date((localStorage.getItem("TODOUpdateTime") === undefined) ? "2000-01-01T01:00:00Z" : localStorage.getItem("TODOUpdateTime"));
let TODOList = [];
function TODO(repos) {
    //let promiseList = [];
    const TODORegex = /TODO\s*:/;
    const now = new Date();
    localStorage.setItem("TODOUpdateTime", now.toString());
    const parentDiv = document.getElementById("TODOs");
    repos.forEach((repo) => {
        const pushedAt = new Date(repo.pushed_at);
        const monthDiff = now.getMonth() - pushedAt.getMonth() + (12 * (now.getFullYear() - pushedAt.getFullYear()));
        //if (pushedAt <= TODOUpdateTime || monthDiff > 12) return;
        //promiseList.push(
        $.getJSON("https://api.github.com/repos/awidesky/" + repo['name'] + "/git/trees/" + repo['latest_branch'] + "?recursive=1", (files) => {
            files = files.tree.filter((f) => f.type == "blob").filter(testSourceFile); //only check "blob"(file), not "tree"(directory).
            if(files.length == 0) return;
            const div = document.createElement("div");
            div.classList.add("TODOdiv");
            const title = document.createElement("a");
            title.href = repo['html_url'];
            title.innerHTML = "<h2>" + repo['name'] + "</h2>";
            div.appendChild(title);
            const ul = document.createElement("ul");
            div.appendChild(ul);
            files.forEach((f) => { //요기 map으로. 이후 when에서 다 집어넣기
                findGithubFile(repo['name'], repo['latest_branch'], f.path, (raw) => { 
                    let list = [];
                    let i = 0;
                    let obj = {
                        filename: f.path.substr(f.path.lastIndexOf("/") + 1)
                    };
                    const lines = raw.split('\n');
                    lines.forEach((s) => {
                        i++;
                        if (TODORegex.test(s)) {
                            let surrounding = [];
                            let ct = 0;
                            for(let lineCnt = 1; -1 < (i - 1 - lineCnt) && (i - 1 - lineCnt) < lines.length; lineCnt++) {
                                const str = lines[i - 1 - lineCnt];
                                if(/\S/.test(str)) {
                                    surrounding.unshift(str.replaceAll("<", "&lt").replaceAll(">", "&gt"));
                                    ct++;
                                }
                                if(ct > 3) break;
                            }
                            surrounding.push("<span style='color:yellow;'>" + s + "</span>");
                            ct = 0;
                            for(let lineCnt = 0; -1 < (i + 1 + lineCnt) && (i + 1 + lineCnt) < lines.length; lineCnt++) {
                                const str = lines[i + 1 + lineCnt];
                                if(/\S/.test(str)) {
                                    surrounding.push(str.replaceAll("<", "&lt").replaceAll(">", "&gt"));
                                    ct++;
                                }
                                if(ct > 3) break;
                            }
                            const surroundingStr = trimLeadingWS(surrounding.join("<br>"));
                            s = s.substr(s.search(TODORegex));
                            obj.line = i;
                            obj.str = s;
                            obj.codes = surroundingStr;
                            obj.link = "https://github.com/awidesky/" + repo['name'] + "/blob/" + repo['latest_branch'] + "/" + f.path + "#L" + obj.line;
                            list.push(obj);
                            //console.log("pushing : " + JSON.stringify(obj));
                        }
                    });

                    if(list.length == 0) return;
                    if(ul.childElementCount == 0) parentDiv.appendChild(div);

                    let exist = {};
                    //여기까지만 하고 list 리턴. when으로 모으고 다 모아서 저장 & DOM manip!
                    list
                    .filter((item) => exist.hasOwnProperty(item.line) ? false : (exist[item.line] = true))
                    .forEach((l) => {
                        TODOList.push({ 'name': repo['name'], 'list': list });

                        const li = document.createElement("li");
                        //li.classList.add("tooltip");
                        const a = document.createElement("a");
                        a.href = l.link;
                        a.textContent = "line " + l.line + " of " + l.filename;
                        li.appendChild(a);
                        const p = document.createElement("p");
                        p.textContent = l.str;
                        const tooltip = document.createElement("pre");
                        tooltip.classList.add("tooltiptext");
                        tooltip.innerHTML = obj.codes;
                        li.appendChild(p);
                        li.appendChild(tooltip);
                        ul.appendChild(li);
                    });
                });
            });
        }).fail(getGithubApiFail(window.location));
    //);
    });

    //console.log(JSON.stringify(TODOList));
    //downloadObjectAsJson(TODOList, "TODOList");
    
}


function testSourceFile(f) {
    return /(ada|adb|ads|asm|bas|bash|bat|c|c\\+\\+|cbl|cc|class|clj|cob|cpp|cs|csh|cxx|d|diff|e|el|f|f77|f90|fish|for|fth|ftn|go|groovy|h|hh|hpp|hs|html|htm|hxx|java|js|jsx|jsp|ksh|kt|lhs|lisp|lua|m|m4|nim|patch|php|pl|po|pp|py|r|rb|rs|s|scala|sh|swg|swift|v|vb|vcxproj|xcodeproj|xml|zsh|sh|bat|crx|bash|csh|fish|ksh|zsh|txt|md|html|htm|css|js|jsx|less|scss|wasm|php)$/
                .test(f.path);
}

// my modification of https://stackoverflow.com/a/52432741/9287652
// change : use <br> not \r\n.
function trimLeadingWS(str) {
    /*
      Get the initial indentation
      But ignore new line characters
    */
    const matcher = /^[(\<br\>)]?(\s+)/;
    if (matcher.test(str)) {
        const commonindent = str.match(matcher).reduce((a, b) => a.length <= b.length ? a : b);
        /*
          Replace the initial whitespace 
          globally and over multiple lines
        */
        return str.replace(commonindent, "").replace(new RegExp("\<br\>" + commonindent, "gm"), "<br>");
    } else {
        // Regex doesn't match so return the original string
        return str;
    }
};
