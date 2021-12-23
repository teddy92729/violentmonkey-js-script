// ==UserScript==
// @name        自動載入下一頁 - masiro.me
// @namespace   Violentmonkey Scripts
// @match       https://masiro.me/admin/novelReading?cid=*
// @grant       none
// @version     1.0
// @author      -
// @description 2021/12/21 下午11:03:39
// ==/UserScript==
var head=document.head;
var nextlink=document.querySelector("#app > section.content > div:nth-child(1) > div > div > div.box-footer > span.next > a");

var textmain=document.querySelector("#app > section.content > div:nth-child(1) > div > div > div.box-body.nvl-content");
var loading=0;
var dom=new DOMParser();

document.addEventListener("scroll",(e)=>{
  if(nextlink!=null&&!loading&&(textmain.getBoundingClientRect().bottom/window.innerHeight<=2)){
    loading=1;
    fetch(nextlink.href).then((respone)=>{
      return respone.text();
    }).then((html)=>{
      var d=dom.parseFromString(html,"text/html");
      var title=d.querySelector("#app > section.content > div:nth-child(1) > div > div > div.box-header.with-border.nov-title-box > span.novel-title > div");
      var text=d.querySelector("#app > section.content > div:nth-child(1) > div > div > div.box-body.nvl-content");
      
      textmain.innerHTML+="<p align=center>"+title.innerText+"</p>";
      textmain.innerHTML+=text.innerHTML;
      nextlink=d.querySelector("#app > section.content > div:nth-child(1) > div > div > div.box-footer > span.next > a");
      if(nextlink==null)textmain.innerHTML+="<p align=center>沒有下一章了</p>";
      loading=0;
    });
  }
});