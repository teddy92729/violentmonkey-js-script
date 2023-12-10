// ==UserScript==
// @name        熱門作品 - pixiv.net
// @namespace   Violentmonkey Scripts
// @match       http*://www.pixiv.net/*
// @grant       none
// @version     2.1
// @author      -
// @run-at      document-start
// @require     https://teddy92729.github.io/tool.js
// @description 2021/12/25 下午3:47:33
// ==/UserScript==
addCssDisplayNone(
    "section div > a[href^=\"/premium/lead/lp/\"]", // 阻擋premium超連結
    "section div:has(a[href^=\"/premium/lead/lp/\"]) > aside > iframe",
    "section div:has(a[href^=\"/premium/lead/lp/\"]) > aside > div", // 阻擋premium廣告文字
    "section div:has(a[href^=\"/premium/lead/lp/\"]) > aside > button", // 阻擋premium廣告按鈕
);
addCss(`
    section div:has(a[href^=\"/premium/lead/lp/\"]) > aside > ul {
        mask: unset;
        overflow-x: overlay;

        &::-webkit-scrollbar {
            height: 10px;
        }
        &::-webkit-scrollbar-track {
            background: #f1f1f1;
            margin-top: 20px;
        }
        &::-webkit-scrollbar-thumb {
            background: #888;
        }
        &::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
    }
`);// 移除熱門作品的漸變遮罩，並加上滾動條

let main = (e) => {
    // 檢查網站位置
    if (/tags\/\S*/.test(window.location.pathname)) {
        let tags = window.location.pathname.split('/')[2];//取得tags
        console.log(tags);

        elementCreated("section div:has(a[href^=\"/premium/lead/lp/\"]) > aside:has(img)") // 等待熱門作品元素生成
            .then((aside) => {
                let ul = aside.querySelector("ul");
                let template_li = ul.children[0].cloneNode(true);//取得第一個熱門作品元素作為模板
                console.log("found ", ul);
                // 依模板生成新的熱門作品元素
                let createNewLi = (userId, artworksId, alt, title, src) => {
                    let clone_li = template_li.cloneNode(true);
                    let clone_a = clone_li.querySelector("a");
                    let clone_img = clone_li.querySelector("img");
                    clone_a.dataset.gtmUserId = userId;
                    clone_a.dataset.gtmValue = artworksId;
                    clone_a.href = "/artworks/" + artworksId;
                    clone_img.alt = alt;
                    clone_img.title = title;
                    clone_img.src = src;
                    return clone_li;
                }
                return fetch(`https://www.pixiv.net/ajax/search/artworks/${tags}`).then(res => res.json()).then((data) => {
                    // 取得熱門作品資料
                    let popular = data["body"]["popular"];
                    // 將recent和permanent合併
                    popular = [].concat(popular["recent"], popular["permanent"]);

                    ul.innerHTML = ""; // clear all li
                    for (let v of popular) {
                        let li = createNewLi(v.userId, v.id, v.alt, v.title, v.url);//生成熱門作品元素
                        ul.appendChild(li);
                    }
                });
            }).then(() => {
                console.log("成功執行");
            }).catch((e) => {
                console.error(e);
                afterIdle().then(main);//重新執行
            });
    }
}

window.addEventListener("pushState", () => afterIdle().then(main));//pixiv跳轉
afterIdle().then(main);
