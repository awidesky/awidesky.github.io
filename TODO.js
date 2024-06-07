
let TODOUpdateTime = new Date((localStorage.hasOwnProperty("TODOUpdateTime")) ? "2000-01-01T01:00:00Z" : localStorage.getItem("TODOUpdateTime"));
let TODOList = [];
function TODO(repos) {
    if(localStorage.hasOwnProperty("TODOList")) downloadObjectAsJson(JSON.parse(LZString.decompress(localStorage.getItem("TODOList"))), "TODOList_Cached");
    //let promiseList = [];
    const TODORegex = /TODO\s*:/;
    const now = new Date();
    localStorage.setItem("TODOUpdateTime", now.toString());
    const parentDiv = document.getElementById("TODOs");
    $.when.apply($, repos.map((repo) => {
        const pushedAt = new Date(repo.pushed_at);
        const monthDiff = now.getMonth() - pushedAt.getMonth() + (12 * (now.getFullYear() - pushedAt.getFullYear()));
        //if (pushedAt <= TODOUpdateTime || monthDiff > 12) return;
        //완성되면 getGithubAPI 쓰기
        return $.getJSON("https://api.github.com/repos/awidesky/" + repo['name'] + "/git/trees/" + repo['latest_branch'] + "?recursive=1").then((files) => {
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
            const promiseList = [];
            files.forEach((f) => promiseList.push(findGithubFile(repo['name'], repo['latest_branch'], f.path).then((raw) => {  //잘 되면 이거 그냥 안으로 넣어버리기?
                let list = [];
                let i = 0;
                let obj = {
                    f: f.path.substr(f.path.lastIndexOf("/") + 1)
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
                                surrounding.unshift(str.replaceAll("<", "&lt").replaceAll(">", "&gt").replace(/\t/g, "    "));
                                ct++;
                            }
                            if(ct > 3) break;
                        }
                        const indexOfS = surrounding.length;
                        ct = 0;
                        for(let lineCnt = 0; -1 < (i - 1 + lineCnt) && (i - 1 + lineCnt) < lines.length; lineCnt++) {
                            const str = lines[i - 1 + lineCnt];
                            if(/\S/.test(str)) {
                                surrounding.push(str.replaceAll("<", "&lt").replaceAll(">", "&gt").replace(/\t/g, "    "))
                                ct++;
                            }
                            if(ct > 4) break;
                        }
                        const indentCorrectedList = trimLeadingWS(surrounding.join("\r\n")).split("\r\n");
                        indentCorrectedList[indexOfS] = "<span style='color:yellow;'>" + indentCorrectedList[indexOfS] + "</span>";
                        const surroundingStr = indentCorrectedList.join("<br>").replace(/[\r\n]/g, "");
                        s = s.substr(s.search(TODORegex));
                        obj.l = i;
                        obj.s = s;
                        obj.c = surroundingStr;
                        obj.li = "https://github.com/awidesky/" + repo['name'] + "/blob/" + repo['latest_branch'] + "/" + f.path + "#L" + obj.l;
                        list.push(obj);
                    }
                });

                let exist = {};
                list = list.filter((item) => exist.hasOwnProperty(item.l) ? false : (exist[item.l] = true));
                //console.log("list : " + JSON.stringify(list, null, 4));
                return list;
            })));
            //console.log("promiseList \"" + promiseList + "\", type : " + Object.prototype.toString.call(promiseList[0]));
            return $.when.apply($, promiseList).then((...list) => {
                list = [].concat(...list.filter(Array.isArray))
                //console.log("asdf \"" + JSON.stringify(list, null, 4) + "\", type : " + Object.prototype.toString.call(list));
                if (list.length == 0) return null;

                if (ul.childElementCount == 0) parentDiv.appendChild(div);
                list.forEach((l) => {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.href = l.li;
                    a.textContent = "line " + l.l + " of " + l.f;
                    li.appendChild(a);
                    const p = document.createElement("p");
                    p.textContent = l.s;
                    const tooltip = document.createElement("pre");
                    tooltip.classList.add("tooltiptext");
                    tooltip.innerHTML = l.c;
                    li.appendChild(p);
                    li.appendChild(tooltip);
                    ul.appendChild(li);
                });
                return { 'name': repo['name'], 'list': list };
            });
        });
    })).then((...TODOList) => {
        TODOList = [].concat(...TODOList.filter(Array.isArray))
        console.log("TODOList : " + JSON.stringify(TODOList, null, 4));
        let t1 = performance.now();
        const un = JSON.stringify(TODOList);
        t1 = performance.now() - t1;
        console.log("unzipped size : " + un.length + ", time : " + t1);
        t1 = performance.now();
        const zi = LZString.compress(JSON.stringify(TODOList));
        t1 = performance.now() - t1;
        console.log("zipped size : " + zi.length + ", time : " + t1);
        downloadObjectAsJson(TODOList, "TODOList");

        localStorage.setItem("TODOList", LZString.compress(JSON.stringify(TODOList)));
    }, getGithubApiFail(window.location));
}


function testSourceFile(f) {
    return /\.(asm|bash|bat|c|c\\+\\+|cc|class|cpp|cs|csh|css|cxx|go|groovy|h|hh|hpp|hs|html|htm|hxx|java|jsp|js|jsx|lisp|lua|md|php|py|r|rb|rs|s|scala|sh|txt|swift|v|vb|vcxproj|wasm|xcodeproj|xml|zsh)$/
                .test(f.path);
}

// my modification of https://stackoverflow.com/a/52432741/9287652
// change : use <br> not \r\n.
function trimLeadingWS(str) {
    /*
      Get the initial indentation
      But ignore new line characters
    */
    const matcher = /^[\r\n]?(\s+)/;
    if (matcher.test(str)) {
        const commonindent = str.match(matcher).reduce((a, b) => a.length <= b.length ? a : b);
        /*
          Replace the initial whitespace 
          globally and over multiple lines
        */
       //str.replace(commonindent, "")
        return str.replace(new RegExp("^" + commonindent, "gm"), "");
    } else {
        // Regex doesn't match so return the original string
        return str;
    }
};
