// ==UserScript==
// @name        kemono.party faster
// @namespace   Violentmonkey Scripts
// @match       https://kemono.party/*/user/*/post/*
// @grant       none
// @version     1.0
// @author      -
// @description 2022/1/31 下午1:08:03
// ==/UserScript==
var file=document.querySelectorAll("a.fileThumb.image-link");
var imgLinks=[];
for(var f of file){
  var href=f.href.split("/").slice(3).join("/");
  imgLinks.push(href);
}
var server=[
  "https://data1.kemono.party/",
  "https://data2.kemono.party/",
  "https://data3.kemono.party/",
  "https://data4.kemono.party/",
  // "https://data5.kemono.party/",
  // "https://data6.kemono.party/",
  // "https://data7.kemono.party/",
  // "https://data8.kemono.party/",
];
var complete=[];
for(var index in server)complete.push(0);

console.log(imgLinks);
file=document.querySelector("div.post__files");
file.innerHTML="";

var len=document.createElement("p");
len.innerText="length="+imgLinks.length+":"+server.length;
file.appendChild(len);

var id=setInterval((function(){
  var imgC=0;
  return function(){
    for(var index in server){
      if(imgC>=imgLinks.length){
        clearInterval(id);
        var done=document.createElement("p");
        done.innerText="done";
        file.appendChild(done);
        return;
      }
      if(!complete[index]||complete[index].complete){
        var img=document.createElement("img");
        img.src=server[index]+imgLinks[imgC];
        file.appendChild(img);
        complete[index]=img;
        imgC+=1;
      }
    }
  };
})(),200);