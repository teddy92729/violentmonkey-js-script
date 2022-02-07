// ==UserScript==
// @name        kemono.party faster
// @namespace   Violentmonkey Scripts
// @match       https://kemono.party/*/user/*/post/*
// @version     1.1
// @author      -
// @description 2022/1/31 下午1:08:03
// ==/UserScript==

var style=document.createElement("style");
style.innerText=`
  .pageNum{
    height:22px;
    width:100%;
    background:#E6E6E6;
    margin:30px 0px;
    font:bold 18px Arial;
    color:black;
    text-align:center;
    display:block;
  }
`;
document.head.appendChild(style);

var file=document.querySelectorAll("a.fileThumb.image-link");
var imgLinks=[];
for(var f of file){
  var href=f.href.split("/").slice(3).join("/");
  imgLinks.push(href);
}
// console.log(imgLinks);


var server=[]
for(let index of Array(8).keys()){
  server.push(`https://data${index+1}.kemono.party/`);
}


complete=Array(8).fill(null);
const getServer=function(){
  let id=Math.floor(Math.random()*server.length);
  if(!complete[id]||complete[id].complete){
    return id;
  }
  return null;
}


file=document.querySelector("div.post__files");
file.innerHTML="";

var len=document.createElement("div");
len.className="pageNum";
len.innerText="length="+imgLinks.length;
file.appendChild(len);

var id=setInterval((function(){
  var imgC=0;
  return function(){
    let serverId=getServer();
    if(imgC>=imgLinks.length){
      clearInterval(id);
      var done=document.createElement("div");
      done.innerText="done";
      done.className="pageNum";
      file.appendChild(done);
      return;
    }else if(serverId!=null){
      var d=document.createElement("div");
      d.innerText=imgC;
      d.className="pageNum";
      file.appendChild(d);
      
      var img=document.createElement("img");
      img.src=server[serverId]+imgLinks[imgC];
      complete[serverId]=img;
      file.appendChild(img);
      imgC+=1;
    }
  }
})(),200);
