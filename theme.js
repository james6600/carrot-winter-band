// 화이트·나이트 모드: 고른 값(kw-theme)이 없으면 기기 설정을 따른다. 그리기 전에 정해서 깜빡임이 없게.
(function(){ var t; try{ t = localStorage.getItem("kw-theme"); }catch(e){}
  if (t!=="light" && t!=="dark") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t;
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t==="dark" ? "#07080c" : "#ffffff"; })();
