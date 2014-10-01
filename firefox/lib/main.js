var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;

pageMod.PageMod({
  include: "*.facebook.com",
  contentStyleFile: [data.url("content.css")],
  contentScriptFile: [data.url("jquery.min.js"), data.url("content.js")],
  contentScriptOptions: {"comment_icon" : data.url("comment.png")}
});