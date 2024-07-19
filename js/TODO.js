// String.replaceAll polyfill : https://thewebdev.info/2021/08/13/how-to-fix-the-javascript-replaceall-is-not-a-function-error/
if (typeof String.prototype.replaceAll == "undefined") {
    String.prototype.replaceAll = function (match, replace) {
        return this.replace(new RegExp(match, 'g'), () => replace);
    }
}

let TODOUpdateTime = new Date((localStorage.hasOwnProperty("TODOUpdateTime")) ? localStorage.getItem("TODOUpdateTime") : "2000-01-01T01:00:00Z");
let TODOList = [];
let reposLength = -1;
function TODO(repos) {
    reposLength = repos.length;
    if(localStorage.hasOwnProperty("TODOList")) {
        TODOList = JSON.parse(LZString.decompress(localStorage.getItem("TODOList")));
    }
    const TODORegex = /TODO\s*:/;
    const now = new Date();
    const parentDiv = document.getElementById("TODOs");
    return $.when.apply($, repos.map((repo) => {
        let pushedAt = new Date(repo.pushed_at);
        pushedAt.setTime(pushedAt.getTime() + (60 * 1000));
        if(repo['name'] != "DocumentConverter") if (pushedAt <= TODOUpdateTime) return null;
        return getGithubAPI("repos/awidesky/" + repo['name'] + "/git/trees/" + repo['dev_branch'] + "?recursive=1").then((files) => {
            files = files.tree.filter((f) => f.type == "blob").filter(testSourceFile); //only check "blob"(file), not "tree"(directory).
            if(files.length == 0) return;
            const promiseList = [];
            files.forEach((f) => promiseList.push(findGithubFile(repo['name'], repo['dev_branch'], f.path).then((raw) => {  //잘 되면 이거 그냥 안으로 넣어버리기?
                let list = [];
                let i = 0;
                let obj = {
                    f: f.path.substr(f.path.lastIndexOf("/") + 1)
                };
                const lines = raw.split('\n');
                lines.forEach((s) => {
                    i++;
                    if (!TODORegex.test(s)) return;

                    let surrounding = [];
                    let ct = 0;
                    for (let lineCnt = 1; -1 < (i - 1 - lineCnt) && (i - 1 - lineCnt) < lines.length; lineCnt++) {
                        const str = lines[i - 1 - lineCnt];
                        if (/\S/.test(str)) {
                            surrounding.unshift(str.replaceAll("<", "&lt").replaceAll(">", "&gt"));
                            ct++;
                        }
						if(repo['name'] == "DocumentConverter") console.log((i - 1 - lineCnt) + " " + ct + " " + /\S/.test(str) + " \"" + str + " \"");
                        if (ct > 3) break;
                    }
                    const indexOfS = surrounding.length;
					if(repo['name'] == "DocumentConverter") console.log("indexOfS " + indexOfS); 
                    ct = 0;
                    for (let lineCnt = 0; -1 < (i - 1 + lineCnt) && (i - 1 + lineCnt) < lines.length; lineCnt++) {
                        const str = lines[i - 1 + lineCnt];
                        if (/\S/.test(str)) {
                            surrounding.push(str.replaceAll("<", "&lt").replaceAll(">", "&gt"))
                            ct++;
                        }
						if(repo['name'] == "DocumentConverter") console.log((i - 1 + lineCnt) + " " + ct + " " + /\S/.test(str) + " \"" + str + " \"");
                        if (ct > 4) break;
                    }
                    const indentCorrectedList = trimLeadingWS(surrounding);
                    indentCorrectedList[indexOfS] = "<span class='highlightedcode'>" + indentCorrectedList[indexOfS] + "</span>";
					if(repo['name'] == "DocumentConverter") console.log("	surrounding\n" + surrounding.join("\n"));
					if(repo['name'] == "DocumentConverter") console.log(surrounding);
					if(repo['name'] == "DocumentConverter") console.log("	indentCorrectedList\n" + indentCorrectedList.join("\n"));
                    const surroundingStr = indentCorrectedList.filter(s => s.length != 0).join("<br>").replace(/[\r\n]/g, "");
                    s = s.substr(s.search(TODORegex));
                    obj.l = i;
                    obj.s = s;
                    obj.c = surroundingStr;
                    obj.li = "https://github.com/awidesky/" + repo['name'] + "/blob/" + repo['dev_branch'] + "/" + f.path + "#L" + obj.l;
                    list.push(obj);
                });

                let exist = {};
                list = list.filter((item) => exist.hasOwnProperty(item.l) ? false : (exist[item.l] = true));
                return list;
            })));
            return $.when.apply($, promiseList).then((...list) => {
                list = [].concat(...list.filter(Array.isArray))
                if (list.length == 0) return null;

                return { 'name': repo['name'], 'list': list };
            });
        });
    })).then((...gatheredTODOList) => {
        gatheredTODOList.forEach(newt => {
            if (newt == null) return;
            const find = TODOList.find(t => t.name == newt.name);
            if (find === undefined) {
                TODOList.push(newt);
            } else {
                find.list = newt.list;
            }
        });

        document.getElementById('loading').remove();
        TODOList.forEach(t => {
            const div = document.createElement("div");
            div.classList.add("TODOdiv");
            const title = document.createElement("a");
            title.href = "https://github.com/awidesky/" + t.name;
            title.innerHTML = "<h2>" + t.name + "</h2>";
            div.appendChild(title);
            const ul = document.createElement("ul");
            div.appendChild(ul);
            parentDiv.appendChild(div);

            t.list.forEach(l => {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = l.li;
                a.textContent = "line " + l.l + " of " + l.f;
                li.appendChild(a);
                const p = document.createElement("p");
                p.textContent = l.s;
                const tooltip = document.createElement("pre");
                tooltip.classList.add("tooltiptext");
                tooltip.classList.add("hidden");
                tooltip.innerHTML = l.c;
                li.appendChild(p);
                li.appendChild(tooltip);
                /* Mobile touch event instead of hover */
                li.addEventListener('touchstart', () => {
                    li.querySelector('.tooltiptext').classList.remove('hidden');
                });
                li.addEventListener('touchend', () => {
                    li.querySelector('.tooltiptext').classList.add('hidden');
                });
                ul.appendChild(li);
            });
            localStorage.setItem("TODOUpdateTime", now.toString());
        });
        localStorage.setItem("TODOList", LZString.compress(JSON.stringify(TODOList)));
    });
}

function resetTODO() {
    if (window.confirm("This will delete all cached TODO data, and reload all repository info via GitHub api request.\n"
        + "There are " + localStorage.getItem("x-ratelimit-remaining")
        + " available request left from your " + localStorage.getItem("x-ratelimit-limit") + " per hour limit.\n"
        + "After exeeding the limit, you'll have to wait until " + new Date(parseInt(localStorage.getItem("x-ratelimit-reset")) * 1000).toTimeString().split(' ')[0].substring(0, 5)
        + ".\nAre you sure you want to re-search all for TODO?\n"
        + "It'll take about " + (reposLength + 2) + " requests or more.")) {
        localStorage.removeItem("TODOUpdateTime");
        localStorage.removeItem("TODOList");
        location.reload();
        //TODO : 원하는 기간 안으로 조정하는 옵션도 만들기
    }
}

function testSourceFile(f) {
    return /\.(asm|bash|bat|c|c\\+\\+|cc|class|cpp|cs|csh|css|cxx|go|groovy|h|hh|hpp|hs|html|htm|hxx|java|jsp|js|jsx|lisp|lua|md|php|py|r|rb|rs|s|scala|sh|txt|swift|v|vb|vcxproj|wasm|xcodeproj|xml|zsh)$/
                .test(f.path);
}

// my modification of https://stackoverflow.com/a/52432741/9287652
// change : find smallest common indentation, not the first one.
// also, return value is array of string. not a single string
function trimLeadingWS(splitted) {
    //Replace tab to 4 spaces
    splitted.map(s => s.replace(/\t/g, "    "));
    //Get the initial indentation
    //But ignore new line characters
    const matcher = /^[\r\n]?(\s+)/;

    if (splitted.every(s => matcher.test(s))) {
        //For each lines, 1. get s.match(matcher), second element of it is the captured leading whitespace : (\s+)
        //2. change all null(there is no leading spaces) to empty string
        //3. find value of minimum length.
        const commonindent = Math.min(...splitted.map(s => s.match(matcher)).map(s => s === null ? "" : s[1]).map(s => s.length));
        // remove calculated amount of spaces from the string
        return splitted.map(s => s.replace(new RegExp("^[\\s]{" + commonindent + "}"), ""));
    } else {
        // Regex doesn't match so return the original string
        return splitted;
    }
}
