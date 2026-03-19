const { useState, useEffect, useRef, useCallback } = React;

/* ── Config ── */
const API_BASE = "";  // same origin

/* ── Data ── */
const FOOD_CATEGORIES=[{id:"all",label:"전체"},{id:"korean",label:"한식"},{id:"chinese",label:"중식"},{id:"japanese",label:"일식"},{id:"western",label:"양식"},{id:"chicken",label:"치킨"},{id:"pizza",label:"피자"},{id:"burger",label:"버거"},{id:"asian",label:"아시안"},{id:"bunsik",label:"분식"},{id:"meat",label:"고기/구이"},{id:"seafood",label:"해산물"}];
const CAFE_CATEGORIES=[{id:"all",label:"전체"},{id:"coffee",label:"커피전문점"},{id:"dessert",label:"디저트카페"},{id:"bakery",label:"베이커리"},{id:"tea",label:"차/주스"}];
const RADIUS_OPTIONS=[{value:50,label:"50m"},{value:100,label:"100m"},{value:200,label:"200m"},{value:300,label:"300m"},{value:500,label:"500m"},{value:700,label:"700m"},{value:1000,label:"1km"}];
const FORTUNES=["오늘 메뉴는 너!","이거다! 오늘은 여기!","운명이 골라준 맛집!","딱 여기야, 가자!","오늘의 주인공은 바로...","배고픈 당신을 위해!","맛의 신이 점지했다!","여기 안 가면 손해!"];
const CAFE_FORTUNES=["오늘의 힐링은 여기서!","카페인 충전 go!","달달한 오후, 여기로!","커피 한 잔의 행운!","감성 충전 스팟!"];
const CUSTOM_FORTUNES=["룰렛의 선택은!","운명이 결정했다!","오늘은 이거다!","고민 끝! 결과는...","두구두구두구..."];
const PRESET_LOCATIONS=[
  {label:"강남역",sub:"서울 강남구",x:127.0276,y:37.4979},
  {label:"홍대입구역",sub:"서울 마포구",x:126.9237,y:37.5571},
  {label:"신촌역",sub:"서울 서대문구",x:126.9368,y:37.5553},
  {label:"이태원역",sub:"서울 용산구",x:126.9946,y:37.5345},
  {label:"건대입구역",sub:"서울 광진구",x:127.0688,y:37.5404},
  {label:"잠실역",sub:"서울 송파구",x:127.1001,y:37.5133},
  {label:"여의도역",sub:"서울 영등포구",x:126.9244,y:37.5216},
  {label:"판교역",sub:"경기 성남시",x:127.1116,y:37.3948},
];

function mapCategory(cn){
  if(!cn) return "all"; const c=cn.toLowerCase();
  if(c.includes("한식")||c.includes("국밥")||c.includes("백반")) return "korean";
  if(c.includes("중식")||c.includes("중국")) return "chinese";
  if(c.includes("일식")||c.includes("초밥")||c.includes("일본")) return "japanese";
  if(c.includes("양식")||c.includes("이탈리")||c.includes("파스타")||c.includes("스테이크")) return "western";
  if(c.includes("치킨")||c.includes("닭")) return "chicken";
  if(c.includes("피자")) return "pizza";
  if(c.includes("버거")||c.includes("햄버거")) return "burger";
  if(c.includes("아시안")||c.includes("베트남")||c.includes("태국")) return "asian";
  if(c.includes("분식")||c.includes("떡볶이")||c.includes("김밥")) return "bunsik";
  if(c.includes("고기")||c.includes("구이")||c.includes("삼겹")||c.includes("갈비")) return "meat";
  if(c.includes("해산물")||c.includes("횟집")||c.includes("수산")) return "seafood";
  if(c.includes("커피")) return "coffee";
  if(c.includes("디저트")||c.includes("케이크")) return "dessert";
  if(c.includes("베이커리")||c.includes("빵")) return "bakery";
  if(c.includes("차")||c.includes("주스")) return "tea";
  return "all";
}

async function fetchPlaces(type, x, y, radius) {
  const code = type === "cafe" ? "CE7" : "FD6";
  const all = [];
  const EXCLUDE_KEYWORDS = ["직원식당","구내식당","학생식당","사원식당","교직원식당","급식","매점","푸드코트","단체급식","기관식당","위탁급식","급식소","기업체식당","사내식당","복지관식당","병원식당","군부대","기숙사식당","파리바게뜨","파리바게트","뚜레주르","성심당","브레드","베이커리","제과점","제과","빵집","던킨","크리스피크림"];
  for (let page = 1; page <= 3; page++) {
    try {
      const res = await fetch(`${API_BASE}/api/kakao-places?type=category&category_group_code=${code}&x=${x}&y=${y}&radius=${radius}&page=${page}&size=15`);
      if (!res.ok) break;
      const data = await res.json();
      if (data.documents) all.push(...data.documents);
      if (data.meta?.is_end) break;
    } catch (e) { console.error("API error:", e); break; }
  }
  return all.filter(function(d){
    var name = (d.place_name||"").toLowerCase();
    var cat = (d.category_name||"").toLowerCase();
    return !EXCLUDE_KEYWORDS.some(function(kw){ return name.includes(kw)||cat.includes(kw); });
  }).map((d, i) => ({
    id: d.id || `p-${i}`, name: d.place_name || "이름 없음",
    category: mapCategory(d.category_name), categoryName: d.category_name || "",
    distance: parseInt(d.distance) || 0, address: d.road_address_name || d.address_name || "",
    phone: d.phone || "", placeUrl: d.place_url || "", x: d.x, y: d.y,
    blogCount: 0, verified: false,
  }));
}

/* 블로그 리뷰 수 검증 — 각 장소에 대해 네이버 블로그 검색 */
async function verifyPlaces(places) {
  var BLOG_THRESHOLD = 30;
  var verified = [];
  for (var i = 0; i < places.length; i++) {
    try {
      var res = await fetch(API_BASE + "/api/naver-blog?query=" + encodeURIComponent(places[i].name));
      if (res.ok) {
        var data = await res.json();
        places[i].blogCount = data.totalBlogs || 0;
        places[i].verified = places[i].blogCount >= BLOG_THRESHOLD;
      }
    } catch (e) { /* skip */ }
    verified.push(places[i]);
  }
  return verified;
}

/* ═══ CHARACTERS ═══ */
function CharArms({mood,spinning,onClick,size}){
  mood=mood||"default"; size=size||120;
  const faces={
    default:React.createElement(React.Fragment,null,
      React.createElement("ellipse",{cx:68,cy:44,rx:3.5,ry:4.5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:84,cy:44,rx:3.5,ry:4.5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:68,cy:45,rx:1.3,ry:1.3,fill:"#fff"}),React.createElement("ellipse",{cx:84,cy:45,rx:1.3,ry:1.3,fill:"#fff"}),React.createElement("path",{d:"M71 55 Q76 61 81 55",stroke:"#2C2C2A",strokeWidth:2.2,fill:"none",strokeLinecap:"round"}),React.createElement("ellipse",{cx:59,cy:50,rx:5,ry:3,fill:"#F5C4B3",opacity:0.55}),React.createElement("ellipse",{cx:93,cy:50,rx:5,ry:3,fill:"#F5C4B3",opacity:0.55})),
    pushing:React.createElement(React.Fragment,null,
      React.createElement("ellipse",{cx:68,cy:44,rx:3.5,ry:4.5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:84,cy:44,rx:3.5,ry:4.5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:68,cy:45,rx:1.3,ry:1.3,fill:"#fff"}),React.createElement("ellipse",{cx:84,cy:45,rx:1.3,ry:1.3,fill:"#fff"}),React.createElement("ellipse",{cx:76,cy:57,rx:6,ry:4.5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:76,cy:55.5,rx:4,ry:2.5,fill:"#E24B4A",opacity:0.45}),React.createElement("ellipse",{cx:59,cy:49,rx:5.5,ry:3.5,fill:"#F5C4B3",opacity:0.65}),React.createElement("ellipse",{cx:93,cy:49,rx:5.5,ry:3.5,fill:"#F5C4B3",opacity:0.65})),
    excited:React.createElement(React.Fragment,null,
      React.createElement("path",{d:"M64 43 Q68 39 72 43",stroke:"#2C2C2A",strokeWidth:2.2,fill:"none",strokeLinecap:"round"}),React.createElement("path",{d:"M80 43 Q84 39 88 43",stroke:"#2C2C2A",strokeWidth:2.2,fill:"none",strokeLinecap:"round"}),React.createElement("ellipse",{cx:76,cy:56,rx:7,ry:5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:76,cy:54.5,rx:4.5,ry:2.5,fill:"#E24B4A",opacity:0.45}),React.createElement("ellipse",{cx:59,cy:49,rx:6,ry:3.5,fill:"#F5C4B3",opacity:0.7}),React.createElement("ellipse",{cx:93,cy:49,rx:6,ry:3.5,fill:"#F5C4B3",opacity:0.7}),React.createElement("path",{d:"M48 28 L53 34 L44 32Z",fill:"#FFD93D"}),React.createElement("path",{d:"M104 28 L99 34 L108 32Z",fill:"#FFD93D"})),
  };
  const s=spinning?"pushing":mood==="excited"?"excited":"default";
  return React.createElement("svg",{width:size,height:size*0.8,viewBox:"0 0 140 100",fill:"none",onClick:onClick,style:{cursor:"pointer",overflow:"visible"}},
    React.createElement("g",{style:{transformOrigin:"42px 50px",animation:spinning?"armPush 0.35s ease infinite alternate":"none"}},React.createElement("path",{d:"M42 50 Q24 42 12 38",stroke:"#F5C775",strokeWidth:6,fill:"none",strokeLinecap:"round"}),React.createElement("circle",{cx:12,cy:37,r:5.5,fill:"#FFE8A3",stroke:"#F5C775",strokeWidth:1.5})),
    React.createElement("g",{style:{transformOrigin:"110px 50px",animation:spinning?"armWave 0.5s ease infinite alternate":"none"}},React.createElement("path",{d:"M110 50 Q120 40 126 32",stroke:"#F5C775",strokeWidth:6,fill:"none",strokeLinecap:"round"}),React.createElement("circle",{cx:126,cy:31,r:4.5,fill:"#FFE8A3",stroke:"#F5C775",strokeWidth:1.5})),
    React.createElement("circle",{cx:76,cy:46,r:30,fill:"#FFE8A3"}),React.createElement("circle",{cx:76,cy:46,r:30,stroke:"#F5C775",strokeWidth:2,fill:"none"}),
    React.createElement("ellipse",{cx:64,cy:78,rx:8,ry:5,fill:"#FFE8A3",stroke:"#F5C775",strokeWidth:1.5}),React.createElement("ellipse",{cx:88,cy:78,rx:8,ry:5,fill:"#FFE8A3",stroke:"#F5C775",strokeWidth:1.5}),
    faces[s]);
}

function CharHead({mood,size}){
  mood=mood||"default"; size=size||100;
  const faces={
    default:React.createElement(React.Fragment,null,React.createElement("ellipse",{cx:38,cy:52,rx:4,ry:5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:62,cy:52,rx:4,ry:5,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:38,cy:53,rx:1.5,ry:1.5,fill:"#fff"}),React.createElement("ellipse",{cx:62,cy:53,rx:1.5,ry:1.5,fill:"#fff"}),React.createElement("path",{d:"M44 63 Q50 70 56 63",stroke:"#2C2C2A",strokeWidth:2.5,fill:"none",strokeLinecap:"round"}),React.createElement("ellipse",{cx:28,cy:58,rx:6,ry:3.5,fill:"#F5C4B3",opacity:0.6}),React.createElement("ellipse",{cx:72,cy:58,rx:6,ry:3.5,fill:"#F5C4B3",opacity:0.6})),
    excited:React.createElement(React.Fragment,null,React.createElement("path",{d:"M33 50 Q38 46 43 50",stroke:"#2C2C2A",strokeWidth:2.5,fill:"none",strokeLinecap:"round"}),React.createElement("path",{d:"M57 50 Q62 46 67 50",stroke:"#2C2C2A",strokeWidth:2.5,fill:"none",strokeLinecap:"round"}),React.createElement("ellipse",{cx:50,cy:65,rx:8,ry:6,fill:"#2C2C2A"}),React.createElement("ellipse",{cx:50,cy:63,rx:5,ry:3,fill:"#E24B4A",opacity:0.5}),React.createElement("ellipse",{cx:28,cy:56,rx:7,ry:4,fill:"#F5C4B3",opacity:0.7}),React.createElement("ellipse",{cx:72,cy:56,rx:7,ry:4,fill:"#F5C4B3",opacity:0.7}),React.createElement("path",{d:"M16 34 L22 40 L12 38Z",fill:"#FFD93D"}),React.createElement("path",{d:"M84 34 L78 40 L88 38Z",fill:"#FFD93D"})),
  };
  return React.createElement("svg",{width:size,height:size,viewBox:"0 0 100 100",fill:"none"},React.createElement("circle",{cx:50,cy:52,r:34,fill:"#FFE8A3"}),React.createElement("circle",{cx:50,cy:52,r:34,stroke:"#F5C775",strokeWidth:2,fill:"none"}),faces[mood]||faces.default);
}

/* ═══ ROULETTE WHEEL ═══ */
function RouletteWheel({items,spinning,onStop,canvasSize,pointerSide}){
  canvasSize=canvasSize||280; pointerSide=pointerSide||"top";
  const canvasRef=useRef(null),angleRef=useRef(0),speedRef=useRef(0),animRef=useRef(null);
  const pc=["#AFA9EC","#9FE1CB","#F5C4B3","#85B7EB","#ED93B1","#C0DD97","#FAC775","#F7C1C1","#CECBF6","#5DCAA5","#F0997B","#B5D4F4"];
  const tc=["#3C3489","#085041","#712B13","#0C447C","#72243E","#27500A","#633806","#791F1F","#26215C","#04342C","#4A1B0C","#042C53"];
  const pA=pointerSide==="left"?Math.PI:Math.PI/2;
  const draw=useCallback(function(){const cv=canvasRef.current;if(!cv||!items.length)return;const ctx=cv.getContext("2d");const dpr=window.devicePixelRatio||1;cv.width=canvasSize*dpr;cv.height=canvasSize*dpr;cv.style.width=canvasSize+"px";cv.style.height=canvasSize+"px";ctx.scale(dpr,dpr);const c=canvasSize/2,r=c-14,sa=(2*Math.PI)/items.length;ctx.clearRect(0,0,canvasSize,canvasSize);ctx.beginPath();ctx.arc(c,c,r+8,0,2*Math.PI);ctx.fillStyle="#FFE8A3";ctx.fill();ctx.strokeStyle="#F5C775";ctx.lineWidth=2;ctx.stroke();for(var i=0;i<items.length*2;i++){var a=(i/(items.length*2))*2*Math.PI;ctx.beginPath();ctx.arc(c+(r+4)*Math.cos(a),c+(r+4)*Math.sin(a),2.2,0,2*Math.PI);ctx.fillStyle=i%2===0?"#E24B4A":"#fff";ctx.fill();}items.forEach(function(item,i){var s=angleRef.current+i*sa;ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,s,s+sa);ctx.closePath();ctx.fillStyle=pc[i%pc.length];ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2.5;ctx.stroke();ctx.save();ctx.translate(c,c);ctx.rotate(s+sa/2);ctx.fillStyle=tc[i%tc.length];ctx.font="600 "+(items.length>10?"9.5":"11.5")+"px 'Apple SD Gothic Neo','Pretendard',system-ui,sans-serif";ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillText(item.name.length>7?item.name.slice(0,6)+"..":item.name,r-14,0);ctx.restore();});ctx.beginPath();ctx.arc(c,c,26,0,2*Math.PI);ctx.fillStyle="#FFE8A3";ctx.fill();ctx.strokeStyle="#F5C775";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(c,c,19,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();ctx.font="700 9px 'Apple SD Gothic Neo',system-ui";ctx.fillStyle="#BA7517";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("SPIN",c,c);if(pointerSide==="top"){var py=6;ctx.beginPath();ctx.moveTo(c,py+12);ctx.lineTo(c-10,py);ctx.lineTo(c+10,py);ctx.closePath();ctx.fillStyle="#E24B4A";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(c,py+4,2.5,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();}else{var px=6;ctx.beginPath();ctx.moveTo(px+12,c);ctx.lineTo(px,c-10);ctx.lineTo(px,c+10);ctx.closePath();ctx.fillStyle="#E24B4A";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(px+4,c,2.5,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();}},[items,canvasSize,pointerSide]);
  useEffect(function(){if(spinning){speedRef.current=0.22+Math.random()*0.08;var anim=function(){angleRef.current+=speedRef.current;draw();animRef.current=requestAnimationFrame(anim);};anim();}else if(speedRef.current>0){var dec=function(){speedRef.current*=0.984;if(speedRef.current<0.0015){speedRef.current=0;cancelAnimationFrame(animRef.current);var sa=(2*Math.PI)/items.length;var n=((2*Math.PI-(angleRef.current%(2*Math.PI)))+pA)%(2*Math.PI);onStop(items[Math.floor(n/sa)%items.length]);draw();return;}angleRef.current+=speedRef.current;draw();animRef.current=requestAnimationFrame(dec);};dec();}return function(){if(animRef.current)cancelAnimationFrame(animRef.current);};},[spinning]);
  useEffect(function(){draw();},[items,draw]);
  return React.createElement("canvas",{ref:canvasRef,style:{width:canvasSize,height:canvasSize,display:"block"}});
}

/* ═══ UI COMPONENTS ═══ */
function Confetti(){
  var colors=["#534AB7","#1D9E75","#D85A30","#378ADD","#D4537E","#FFD93D","#E24B4A","#639922"];
  var p=useRef(Array.from({length:40},function(_,i){return{id:i,x:Math.random()*100,delay:Math.random()*0.6,dur:1.2+Math.random()*1,sz:4+Math.random()*6,col:colors[i%colors.length],rot:Math.random()*360};})).current;
  return React.createElement("div",{style:{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",borderRadius:24}},
    p.map(function(c){return React.createElement("div",{key:c.id,style:{position:"absolute",left:c.x+"%",top:"-8px",width:c.sz,height:c.sz*0.6,background:c.col,borderRadius:1,transform:"rotate("+c.rot+"deg)",animation:"confettiFall "+c.dur+"s "+c.delay+"s ease-in forwards"}});}));
}

function InfoPill({icon,text}){
  var icons={
    pin:React.createElement("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#888",strokeWidth:2.5},React.createElement("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),React.createElement("circle",{cx:12,cy:10,r:3})),
    phone:React.createElement("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#1D9E75",strokeWidth:2.5},React.createElement("path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"})),
  };
  return React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:"#F9F8F5",fontSize:12,color:"#5F5E5A"}},icons[icon]," ",text);
}

function FilterChip({selected,onClick,children}){
  return React.createElement("button",{onClick:onClick,style:{padding:"7px 14px",borderRadius:50,border:selected?"2px solid #AFA9EC":"1.5px solid #E8E7E1",background:selected?"#EEEDFE":"#fff",color:selected?"#534AB7":"#888780",fontSize:13,fontWeight:selected?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s ease"}},children);
}

function WinnerOverlay({winner,onRetry,onNavigate,onClose,fortune,isCustom}){
  if(!winner) return null;
  return React.createElement("div",{onClick:onClose,style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,animation:"overlayIn 0.25s ease",padding:20}},
    React.createElement("div",{onClick:function(e){e.stopPropagation();},style:{background:"#fff",borderRadius:24,padding:"28px 24px 24px",width:"100%",maxWidth:340,position:"relative",animation:"cardPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden"}},
      React.createElement(Confetti),
      React.createElement("div",{style:{textAlign:"center",position:"relative",zIndex:1}},
        React.createElement(CharHead,{mood:"excited",size:80}),
        React.createElement("div",{style:{fontSize:14,color:"#BA7517",fontWeight:600,margin:"8px 0 4px"}},fortune),
        React.createElement("div",{style:{fontSize:22,fontWeight:700,color:"#2C2C2A",margin:"4px 0 16px"}},winner.name),
        !isCustom&&React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:8}},
          React.createElement(InfoPill,{icon:"pin",text:winner.distance+"m"}),
          winner.phone&&React.createElement(InfoPill,{icon:"phone",text:winner.phone})),
        !isCustom&&React.createElement("div",{style:{fontSize:12,color:"#888780",margin:"4px 0 4px"}},winner.address),
        !isCustom&&winner.categoryName&&React.createElement("div",{style:{fontSize:11,color:"#B4B2A9",margin:"0 0 16px"}},winner.categoryName),
        React.createElement("div",{style:{display:"flex",gap:10,marginTop:isCustom?16:0}},
          React.createElement("button",{onClick:onRetry,style:{flex:1,padding:"13px 0",borderRadius:50,border:"2px solid #EEEDFE",background:"#FAFAFE",color:"#534AB7",fontSize:14,fontWeight:600,cursor:"pointer"}},"다시 돌리기"),
          !isCustom&&React.createElement("button",{onClick:onNavigate,style:{flex:1,padding:"13px 0",borderRadius:50,border:"none",background:"#1EC800",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}},"네이버 지도")))));
}

function WinnerCardInline({winner,onRetry,onNavigate,fortune,isCustom}){
  if(!winner) return null;
  return React.createElement("div",{style:{background:"#FFFCF2",border:"2px solid #FFE8A3",borderRadius:20,padding:20,margin:"20px 0",textAlign:"center",animation:"fadeSlideUp 0.4s ease"}},
    React.createElement("div",{style:{fontSize:13,color:"#BA7517",fontWeight:600,marginBottom:2}},fortune),
    React.createElement("div",{style:{fontSize:18,fontWeight:700,color:"#2C2C2A",marginBottom:12}},winner.name),
    !isCustom&&React.createElement("div",{style:{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:8}},
      React.createElement(InfoPill,{icon:"pin",text:winner.distance+"m"}),
      winner.phone&&React.createElement(InfoPill,{icon:"phone",text:winner.phone})),
    !isCustom&&React.createElement("div",{style:{fontSize:12,color:"#888780",marginBottom:4}},winner.address),
    !isCustom&&winner.categoryName&&React.createElement("div",{style:{fontSize:11,color:"#B4B2A9",marginBottom:12}},winner.categoryName),
    React.createElement("div",{style:{display:"flex",gap:10,marginTop:isCustom?8:0}},
      React.createElement("button",{onClick:onRetry,style:{flex:1,padding:"12px 0",borderRadius:50,border:"2px solid #EEEDFE",background:"#fff",color:"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer"}},"다시 돌리기"),
      !isCustom&&React.createElement("button",{onClick:onNavigate,style:{flex:1,padding:"12px 0",borderRadius:50,border:"none",background:"#1EC800",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}},"네이버 지도")));
}

/* ═══ LOCATION PICKER ═══ */
function LocationPicker({location,setLocation,coords,setCoords}){
  var _s=useState(false),open=_s[0],setOpen=_s[1];
  var _c=useState(""),customInput=_c[0],setCustomInput=_c[1];
  var _g=useState(false),gpsLoading=_g[0],setGpsLoading=_g[1];
  var _e=useState(""),gpsError=_e[0],setGpsError=_e[1];
  var _sr=useState([]),searchResults=_sr[0],setSearchResults=_sr[1];
  var _sl=useState(false),searching=_sl[0],setSearching=_sl[1];
  var panelRef=useRef(null);
  var debounceRef=useRef(null);

  useEffect(function(){var handler=function(e){if(panelRef.current&&!panelRef.current.contains(e.target))setOpen(false);};if(open)document.addEventListener("mousedown",handler);return function(){document.removeEventListener("mousedown",handler);};},[open]);

  // 입력할 때마다 자동검색 (디바운스 300ms)
  useEffect(function(){
    if(!customInput.trim()||customInput.trim().length<1){setSearchResults([]);return;}
    if(debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current=setTimeout(function(){
      setSearching(true);
      fetch(API_BASE+"/api/kakao-places?type=keyword&query="+encodeURIComponent(customInput.trim())+"&size=5")
        .then(function(r){return r.json();})
        .then(function(data){
          if(data.documents){
            setSearchResults(data.documents.map(function(d){
              return {name:d.place_name,address:d.road_address_name||d.address_name||"",x:parseFloat(d.x),y:parseFloat(d.y)};
            }));
          }
          setSearching(false);
        })
        .catch(function(){setSearching(false);});
    },300);
    return function(){if(debounceRef.current)clearTimeout(debounceRef.current);};
  },[customInput]);

  var handleGPS=function(){setGpsLoading(true);setGpsError("");if(!navigator.geolocation){setGpsError("GPS를 지원하지 않는 브라우저예요");setGpsLoading(false);return;}navigator.geolocation.getCurrentPosition(function(pos){setCoords({x:pos.coords.longitude,y:pos.coords.latitude});setLocation("현재 위치");setGpsLoading(false);setOpen(false);},function(err){setGpsError(err.code===1?"위치 권한을 허용해주세요":"위치를 가져올 수 없어요");setGpsLoading(false);},{enableHighAccuracy:true,timeout:8000});};
  var handleSelectResult=function(r){setLocation(r.name);setCoords({x:r.x,y:r.y});setCustomInput("");setSearchResults([]);setOpen(false);};
  var handlePreset=function(loc){setLocation(loc.label);setCoords({x:loc.x,y:loc.y});setOpen(false);};

  return React.createElement("div",{ref:panelRef,style:{position:"relative",marginBottom:10}},
    React.createElement("div",{onClick:function(){setOpen(!open);},style:{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#F9F8F5",borderRadius:50,fontSize:13,cursor:"pointer",border:open?"1.5px solid #AFA9EC":"1.5px solid transparent",transition:"border 0.15s"}},
      React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#BA7517",strokeWidth:2.5},React.createElement("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),React.createElement("circle",{cx:12,cy:10,r:3})),
      React.createElement("span",{style:{color:"#2C2C2A",fontWeight:500,flex:1}},location),
      React.createElement("span",{style:{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fontSize:10,color:"#B4B2A9"}},"\u25BC")),
    open&&React.createElement("div",{style:{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:20,border:"1.5px solid #E8E7E1",padding:12,zIndex:50,animation:"fadeSlideUp 0.15s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.08)"}},
      // GPS 버튼
      React.createElement("button",{onClick:handleGPS,disabled:gpsLoading,style:{width:"100%",padding:"10px 14px",borderRadius:50,border:"1.5px solid #EEEDFE",background:"#FAFAFE",color:"#534AB7",fontSize:13,fontWeight:600,cursor:gpsLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}},
        React.createElement("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"#534AB7",strokeWidth:2},React.createElement("circle",{cx:12,cy:12,r:10}),React.createElement("circle",{cx:12,cy:12,r:3}),React.createElement("line",{x1:12,y1:2,x2:12,y2:6}),React.createElement("line",{x1:12,y1:18,x2:12,y2:22}),React.createElement("line",{x1:2,y1:12,x2:6,y2:12}),React.createElement("line",{x1:18,y1:12,x2:22,y2:12})),
        gpsLoading?"위치 찾는 중...":"현재 위치 사용하기"),
      gpsError&&React.createElement("div",{style:{fontSize:12,color:"#E24B4A",textAlign:"center",marginBottom:8}},gpsError),
      // 검색 입력
      React.createElement("div",{style:{position:"relative",marginBottom:searchResults.length>0?0:12}},
        React.createElement("input",{value:customInput,onChange:function(e){setCustomInput(e.target.value);},placeholder:"장소 검색 (예: 왕십리역, 스타벅스)",autoFocus:true,style:{width:"100%",padding:"9px 14px",borderRadius:searchResults.length>0?"12px 12px 0 0":50,border:"1.5px solid #E8E7E1",fontSize:13,outline:"none",color:"#2C2C2A",background:"#fff",boxSizing:"border-box"}}),
        searching&&React.createElement("div",{style:{position:"absolute",right:12,top:10,fontSize:11,color:"#B4B2A9"}},"검색 중...")),
      // 자동완성 결과
      searchResults.length>0&&React.createElement("div",{style:{border:"1.5px solid #E8E7E1",borderTop:"none",borderRadius:"0 0 12px 12px",marginBottom:12,overflow:"hidden"}},
        searchResults.map(function(r,i){return React.createElement("button",{key:i,onClick:function(){handleSelectResult(r);},style:{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"none",borderTop:i>0?"0.5px solid #F0EFE8":"none",background:"#fff",cursor:"pointer",textAlign:"left",width:"100%",transition:"background 0.1s"},onMouseEnter:function(e){e.currentTarget.style.background="#F9F8F5";},onMouseLeave:function(e){e.currentTarget.style.background="#fff";}},
          React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#534AB7",strokeWidth:2,style:{flexShrink:0}},React.createElement("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),React.createElement("circle",{cx:12,cy:10,r:3})),
          React.createElement("div",{style:{minWidth:0}},
            React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"#2C2C2A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},r.name),
            React.createElement("div",{style:{fontSize:11,color:"#B4B2A9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},r.address)));})),
      // 프리셋
      React.createElement("div",{style:{fontSize:11,color:"#B4B2A9",fontWeight:500,marginBottom:8,paddingLeft:4}},"자주 찾는 장소"),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2,maxHeight:200,overflowY:"auto"}},
        PRESET_LOCATIONS.map(function(loc,i){return React.createElement("button",{key:i,onClick:function(){handlePreset(loc);},style:{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,border:"none",background:location===loc.label?"#EEEDFE":"transparent",cursor:"pointer",textAlign:"left",width:"100%"}},
          React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:location===loc.label?"#534AB7":"#B4B2A9",strokeWidth:2},React.createElement("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),React.createElement("circle",{cx:12,cy:10,r:3})),
          React.createElement("div",null,React.createElement("div",{style:{fontSize:13,fontWeight:500,color:location===loc.label?"#534AB7":"#2C2C2A"}},loc.label),React.createElement("div",{style:{fontSize:11,color:"#B4B2A9"}},loc.sub)));}))));
}

/* ═══ FILTERS ═══ */
function FiltersSection({tab,radius,setRadius,excludedCategories,setExcludedCategories,location,setLocation,showFilters,setShowFilters,coords,setCoords}){
  var cats=tab==="restaurant"?FOOD_CATEGORIES:CAFE_CATEGORIES;
  var toggle=function(id){if(id==="all"){setExcludedCategories(new Set());return;}setExcludedCategories(function(p){var n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});};
  return React.createElement(React.Fragment,null,
    React.createElement(LocationPicker,{location:location,setLocation:setLocation,coords:coords,setCoords:setCoords}),
    React.createElement("button",{onClick:function(){setShowFilters(!showFilters);},style:{width:"100%",padding:"10px 16px",borderRadius:50,border:"1.5px solid #E8E7E1",background:"#fff",color:"#5F5E5A",fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showFilters?10:16}},
      React.createElement("span",null,
        React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#888",strokeWidth:2,style:{verticalAlign:"-2px",marginRight:6}},React.createElement("line",{x1:4,y1:6,x2:20,y2:6}),React.createElement("line",{x1:8,y1:12,x2:20,y2:12}),React.createElement("line",{x1:12,y1:18,x2:20,y2:18}),React.createElement("circle",{cx:6,cy:12,r:2,fill:"#888"}),React.createElement("circle",{cx:10,cy:18,r:2,fill:"#888"}),React.createElement("circle",{cx:8,cy:6,r:2,fill:"#888"})),
        "검색 조건 설정"),
      React.createElement("span",{style:{transform:showFilters?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fontSize:10,color:"#B4B2A9"}},"\u25BC")),
    showFilters&&React.createElement("div",{style:{padding:16,background:"#FAFAF7",borderRadius:20,marginBottom:16,animation:"fadeSlideUp 0.2s ease",border:"1.5px solid #F0EFE8"}},
      React.createElement("div",{style:{marginBottom:14}},
        React.createElement("div",{style:{fontSize:12,color:"#888780",marginBottom:8,fontWeight:600}},"반경 거리"),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},RADIUS_OPTIONS.map(function(r){return React.createElement(FilterChip,{key:r.value,selected:radius===r.value,onClick:function(){setRadius(r.value);}},r.label);}))),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:12,color:"#888780",marginBottom:8,fontWeight:600}},"카테고리"),
        React.createElement("div",{style:{display:"flex",gap:6,marginBottom:8}},
          React.createElement("button",{onClick:function(){setExcludedCategories(new Set());},style:{padding:"5px 12px",borderRadius:50,border:excludedCategories.size===0?"2px solid #AFA9EC":"1.5px solid #E8E7E1",background:excludedCategories.size===0?"#EEEDFE":"#fff",color:excludedCategories.size===0?"#534AB7":"#888780",fontSize:12,fontWeight:excludedCategories.size===0?600:400,cursor:"pointer"}},"전체 선택"),
          React.createElement("button",{onClick:function(){var allIds=new Set(cats.slice(1).map(function(c){return c.id;}));setExcludedCategories(allIds);},style:{padding:"5px 12px",borderRadius:50,border:excludedCategories.size===cats.length-1?"2px solid #F7C1C1":"1.5px solid #E8E7E1",background:excludedCategories.size===cats.length-1?"#FFF5F5":"#fff",color:excludedCategories.size===cats.length-1?"#E24B4A":"#888780",fontSize:12,fontWeight:excludedCategories.size===cats.length-1?600:400,cursor:"pointer"}},"전체 해제")),
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
          cats.slice(1).map(function(c){return React.createElement(FilterChip,{key:c.id,selected:!excludedCategories.has(c.id),onClick:function(){toggle(c.id);}},c.label);})))));
}

/* ═══ PLACE ROULETTE ═══ */
function PlaceRoulette({rouletteItems,filteredPlaces,spinning,setSpinning,winner,setWinner,showOverlay,setShowOverlay,fortune,setFortune,charMood,setCharMood,tab,filterProps,loading,onRefresh,verifiedMode,setVerifiedMode,verifying,totalPages,currentPage}){
  var spin=function(){if(rouletteItems.length<2)return;setWinner(null);setShowOverlay(false);setCharMood("pushing");var f=tab==="restaurant"?FORTUNES:CAFE_FORTUNES;setFortune(f[Math.floor(Math.random()*f.length)]);setSpinning(true);};
  var stop=function(){setSpinning(false);};
  var onWin=function(w){setWinner(w);setShowOverlay(true);setCharMood("excited");};
  var nav=function(){if(winner)window.open("https://map.naver.com/v5/search/"+encodeURIComponent(winner.name+" "+winner.address),"_blank");};
  var retry=function(){setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");};
  var charClick=function(){if(spinning)stop();else spin();};

  return React.createElement(React.Fragment,null,
    React.createElement("div",{style:{textAlign:"center",padding:"20px 0 8px"}},
      React.createElement("h1",{style:{fontSize:22,fontWeight:700,color:"#2C2C2A",margin:0}},tab==="restaurant"?"오늘 뭐 먹지?":"어디서 마실까?"),
      React.createElement("p",{style:{fontSize:13,color:"#888780",margin:"2px 0 0"}},"고민은 룰렛에게 맡기세요")),
    // 검증된 맛집 토글
    React.createElement("div",{onClick:function(){setVerifiedMode(!verifiedMode);},style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:verifiedMode?"#EEEDFE":"#F9F8F5",borderRadius:50,marginBottom:10,cursor:"pointer",border:verifiedMode?"1.5px solid #AFA9EC":"1.5px solid transparent",transition:"all 0.2s"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
        React.createElement("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:verifiedMode?"#534AB7":"none",stroke:verifiedMode?"#534AB7":"#888",strokeWidth:2},React.createElement("path",{d:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"})),
        React.createElement("span",{style:{fontSize:13,fontWeight:500,color:verifiedMode?"#534AB7":"#2C2C2A"}},"검증된 맛집만"),
        verifying&&React.createElement("span",{style:{fontSize:11,color:"#B4B2A9"}},"(검증 중...)")),
      React.createElement("div",{style:{width:44,height:24,borderRadius:12,background:verifiedMode?"#534AB7":"#D3D1C7",position:"relative",transition:"background 0.2s"}},
        React.createElement("div",{style:{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:verifiedMode?22:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}))),
    verifiedMode&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#EEEDFE",borderRadius:12,marginBottom:10,fontSize:12,color:"#534AB7"}},
      React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#534AB7",strokeWidth:2},React.createElement("path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}),React.createElement("polyline",{points:"22 4 12 14.01 9 11.01"})),
      "블로그 리뷰 30건 이상인 곳만 표시돼요"),
    React.createElement(FiltersSection,filterProps),
    loading?React.createElement("div",{style:{textAlign:"center",padding:"3rem 1rem"}},
      React.createElement("div",{style:{animation:"wiggle 0.6s ease infinite",display:"inline-block"}},React.createElement(CharArms,{mood:"default",size:90})),
      React.createElement("p",{style:{color:"#BA7517",fontSize:14,fontWeight:600,marginTop:12}},"주변 맛집을 찾고 있어요..."))
    :rouletteItems.length>=2?React.createElement(React.Fragment,null,
      fortune&&!winner&&React.createElement("div",{style:{textAlign:"center",marginBottom:8,animation:"fadeSlideUp 0.3s ease"}},React.createElement("span",{style:{fontSize:15,fontWeight:600,color:"#BA7517"}},fortune)),
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",position:"relative",margin:"0 auto",maxWidth:420}},
        React.createElement("div",{style:{position:"relative",zIndex:2,marginRight:-28,flexShrink:0,animation:spinning?"none":charMood==="excited"?"bounce 0.6s ease infinite":"none"}},React.createElement(CharArms,{mood:charMood==="pushing"?"pushing":charMood,spinning:spinning,onClick:charClick,size:110})),
        React.createElement("div",{style:{position:"relative",zIndex:1}},React.createElement(RouletteWheel,{items:rouletteItems,spinning:spinning,onStop:onWin,canvasSize:260,pointerSide:"left"}))),
      React.createElement("div",{style:{textAlign:"center",marginTop:8,opacity:winner?0:1,transition:"opacity 0.3s"}},
        React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:50,background:"#FFFCF2",border:"1.5px solid #FFE8A3",fontSize:12,color:"#BA7517",fontWeight:500}},spinning?"다시 터치하면 멈춰요!":"캐릭터를 터치하면 손이 닿은 곳이 당첨!")),
      !winner&&React.createElement("div",{style:{textAlign:"center",marginTop:12}},
        React.createElement("button",{onClick:spinning?stop:spin,style:{padding:"10px 32px",borderRadius:50,border:spinning?"2px solid #F7C1C1":"2px solid #EEEDFE",background:spinning?"#FFF5F5":"#FAFAFE",color:spinning?"#E24B4A":"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer",animation:spinning?"pulse 0.7s ease infinite":"none"}},spinning?"멈추기":"또는 여기를 눌러 돌리기")),
      React.createElement(WinnerCardInline,{winner:winner,onRetry:retry,onNavigate:nav,fortune:fortune}))
    :React.createElement("div",{style:{textAlign:"center",padding:"2.5rem 1rem"}},
      React.createElement(CharArms,{mood:"default",size:90}),
      React.createElement("p",{style:{color:"#888780",fontSize:14,marginTop:12}},"주변에 장소가 부족해요"),
      React.createElement("p",{style:{color:"#B4B2A9",fontSize:13}},"반경을 넓히거나 위치를 변경해보세요!")),
    rouletteItems.length>=2&&React.createElement("div",{style:{textAlign:"center",marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}},
      React.createElement("span",{style:{fontSize:12,color:"#B4B2A9"}},filteredPlaces.length+"개 중 "+rouletteItems.length+"곳 참여 중"+(totalPages>1?" ("+currentPage+"/"+totalPages+")" :"")),
      totalPages>1&&React.createElement("button",{onClick:onRefresh,style:{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 14px",borderRadius:50,border:"1.5px solid #E8E7E1",background:"#fff",color:"#888780",fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}},
        React.createElement("svg",{width:12,height:12,viewBox:"0 0 24 24",fill:"none",stroke:"#888",strokeWidth:2.5},React.createElement("path",{d:"M23 4v6h-6"}),React.createElement("path",{d:"M1 20v-6h6"}),React.createElement("path",{d:"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"})),
        "다른 가게 보기")),
    React.createElement(WinnerOverlay,{winner:showOverlay?winner:null,onRetry:retry,onNavigate:nav,onClose:function(){setShowOverlay(false);},fortune:fortune}));
}

/* ═══ CUSTOM TAB ═══ */
function CustomTab(){
  var _i=useState(["짜장면","짬뽕","볶음밥","탕수육"]),items=_i[0],setItems=_i[1];
  var _inp=useState(""),input=_inp[0],setInput=_inp[1];
  var _sp=useState(false),spinning=_sp[0],setSpinning=_sp[1];
  var _w=useState(null),winner=_w[0],setWinner=_w[1];
  var _o=useState(false),showOverlay=_o[0],setShowOverlay=_o[1];
  var _f=useState(""),fortune=_f[0],setFortune=_f[1];
  var _m=useState("default"),charMood=_m[0],setCharMood=_m[1];
  var addItem=function(){var v=input.trim();if(v&&items.length<12&&!items.includes(v)){setItems(items.concat([v]));setInput("");}};
  var removeItem=function(idx){setItems(items.filter(function(_,i){return i!==idx;}));};
  var rItems=items.map(function(name,i){return{id:"c-"+i,name:name};});
  var spin=function(){if(rItems.length<2)return;setWinner(null);setShowOverlay(false);setCharMood("pushing");setFortune(CUSTOM_FORTUNES[Math.floor(Math.random()*CUSTOM_FORTUNES.length)]);setSpinning(true);};
  var stop=function(){setSpinning(false);};var onWin=function(w){setWinner(w);setShowOverlay(true);setCharMood("excited");};var retry=function(){setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");};var charClick=function(){if(spinning)stop();else spin();};

  return React.createElement(React.Fragment,null,
    React.createElement("div",{style:{textAlign:"center",padding:"20px 0 8px"}},
      React.createElement("h1",{style:{fontSize:20,fontWeight:700,color:"#2C2C2A",margin:0}},"나만의 룰렛"),
      React.createElement("p",{style:{fontSize:13,color:"#888780",margin:"2px 0 0"}},"원하는 항목을 직접 입력하세요")),
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
      React.createElement("input",{value:input,onChange:function(e){setInput(e.target.value);},onKeyDown:function(e){if(e.key==="Enter")addItem();},placeholder:"항목 입력 (최대 12개)",maxLength:20,style:{flex:1,padding:"10px 16px",borderRadius:50,border:"1.5px solid #E8E7E1",background:"#fff",fontSize:13,outline:"none",color:"#2C2C2A"}}),
      React.createElement("button",{onClick:addItem,disabled:!input.trim()||items.length>=12,style:{padding:"10px 20px",borderRadius:50,border:"none",background:input.trim()&&items.length<12?"#534AB7":"#E8E7E1",color:input.trim()&&items.length<12?"#fff":"#B4B2A9",fontSize:13,fontWeight:600,cursor:input.trim()&&items.length<12?"pointer":"not-allowed"}},"추가")),
    React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,minHeight:36}},
      items.map(function(item,i){return React.createElement("span",{key:i,style:{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:50,background:"#EEEDFE",color:"#534AB7",fontSize:13,fontWeight:500}},item,
        React.createElement("svg",{onClick:function(){removeItem(i);},width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"#534AB7",strokeWidth:2.5,style:{cursor:"pointer",marginLeft:2}},React.createElement("line",{x1:18,y1:6,x2:6,y2:18}),React.createElement("line",{x1:6,y1:6,x2:18,y2:18})));}),
      items.length===0&&React.createElement("span",{style:{fontSize:13,color:"#B4B2A9",padding:"6px 0"}},"항목을 추가해주세요")),
    rItems.length>=2?React.createElement(React.Fragment,null,
      fortune&&!winner&&React.createElement("div",{style:{textAlign:"center",marginBottom:8,animation:"fadeSlideUp 0.3s ease"}},React.createElement("span",{style:{fontSize:15,fontWeight:600,color:"#BA7517"}},fortune)),
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",position:"relative",margin:"0 auto",maxWidth:420}},
        React.createElement("div",{style:{position:"relative",zIndex:2,marginRight:-28,flexShrink:0,animation:spinning?"none":charMood==="excited"?"bounce 0.6s ease infinite":"none"}},React.createElement(CharArms,{mood:charMood==="pushing"?"pushing":charMood,spinning:spinning,onClick:charClick,size:110})),
        React.createElement("div",{style:{position:"relative",zIndex:1}},React.createElement(RouletteWheel,{items:rItems,spinning:spinning,onStop:onWin,canvasSize:260,pointerSide:"left"}))),
      React.createElement("div",{style:{textAlign:"center",marginTop:8,opacity:winner?0:1,transition:"opacity 0.3s"}},
        React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:50,background:"#FFFCF2",border:"1.5px solid #FFE8A3",fontSize:12,color:"#BA7517",fontWeight:500}},spinning?"다시 터치하면 멈춰요!":"캐릭터를 터치하면 손이 닿은 곳이 당첨!")),
      !winner&&React.createElement("div",{style:{textAlign:"center",marginTop:12}},
        React.createElement("button",{onClick:spinning?stop:spin,style:{padding:"10px 32px",borderRadius:50,border:spinning?"2px solid #F7C1C1":"2px solid #EEEDFE",background:spinning?"#FFF5F5":"#FAFAFE",color:spinning?"#E24B4A":"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer",animation:spinning?"pulse 0.7s ease infinite":"none"}},spinning?"멈추기":"또는 여기를 눌러 돌리기")),
      React.createElement(WinnerCardInline,{winner:winner,onRetry:retry,fortune:fortune,isCustom:true}))
    :React.createElement("div",{style:{textAlign:"center",padding:"2rem 1rem"}},
      React.createElement(CharArms,{mood:"default",size:80}),
      React.createElement("p",{style:{color:"#888780",fontSize:14,marginTop:12}},"항목을 2개 이상 추가하면 룰렛을 돌릴 수 있어요!")),
    React.createElement(WinnerOverlay,{winner:showOverlay?winner:null,onRetry:retry,onClose:function(){setShowOverlay(false);},fortune:fortune,isCustom:true}));
}

/* ═══ MAIN APP ═══ */
function App(){
  var _t=useState("restaurant"),mainTab=_t[0],setMainTab=_t[1];
  var _r=useState(500),radius=_r[0],setRadius=_r[1];
  var _ex=useState(new Set()),excludedCategories=_ex[0],setExcludedCategories=_ex[1];
  var _sp=useState(false),spinning=_sp[0],setSpinning=_sp[1];
  var _w=useState(null),winner=_w[0],setWinner=_w[1];
  var _o=useState(false),showOverlay=_o[0],setShowOverlay=_o[1];
  var _f=useState(""),fortune=_f[0],setFortune=_f[1];
  var _sf=useState(false),showFilters=_sf[0],setShowFilters=_sf[1];
  var _l=useState("강남역"),location=_l[0],setLocation=_l[1];
  var _co=useState({x:127.0276,y:37.4979}),coords=_co[0],setCoords=_co[1];
  var _ap=useState({restaurant:[],cafe:[]}),allPlaces=_ap[0],setAllPlaces=_ap[1];
  var _cm=useState("default"),charMood=_cm[0],setCharMood=_cm[1];
  var _ld=useState(false),loading=_ld[0],setLoading=_ld[1];
  var _pg=useState(0),pageIndex=_pg[0],setPageIndex=_pg[1];
  var _vm=useState(false),verifiedMode=_vm[0],setVerifiedMode=_vm[1];
  var _vl=useState(false),verifying=_vl[0],setVerifying=_vl[1];

  var onRefresh=function(){setPageIndex(function(p){return p+1;});resetState();};

  useEffect(function(){
    if(!coords.x||!coords.y) return;
    var placeTab=mainTab==="restaurant"||mainTab==="cafe"?mainTab:"restaurant";
    setLoading(true);
    setPageIndex(0);
    fetchPlaces(placeTab,coords.x,coords.y,radius).then(function(data){
      var shuffled=data.sort(function(){return Math.random()-0.5;});
      setAllPlaces(function(prev){var next={};next[placeTab]=shuffled;return Object.assign({},prev,next);});
      setLoading(false);
      setVerifying(true);
      verifyPlaces(shuffled).then(function(verified){
        setAllPlaces(function(prev){var next={};next[placeTab]=verified;return Object.assign({},prev,next);});
        setVerifying(false);
      });
    });
  },[coords.x,coords.y,radius,mainTab]);

  var placeTab=mainTab==="restaurant"||mainTab==="cafe"?mainTab:"restaurant";
  var filteredPlaces=(allPlaces[placeTab]||[]).filter(function(p){
    if(excludedCategories.has(p.category)) return false;
    if(verifiedMode && !p.verified) return false;
    return true;
  });
  // 페이지 기반으로 12개씩 순환
  var totalFiltered=filteredPlaces.length;
  var startIdx=(pageIndex*12)%Math.max(totalFiltered,1);
  var rouletteItems=[];
  if(totalFiltered>0){
    for(var ri=0;ri<Math.min(12,totalFiltered);ri++){
      rouletteItems.push(filteredPlaces[(startIdx+ri)%totalFiltered]);
    }
  }
  var totalPages=Math.ceil(totalFiltered/12);
  var currentPage=(pageIndex%Math.max(totalPages,1))+1;
  var resetState=function(){setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");setSpinning(false);};
  var onTabChange=function(t){setMainTab(t);resetState();setExcludedCategories(new Set());};
  var filterProps={tab:placeTab,radius:radius,setRadius:setRadius,excludedCategories:excludedCategories,setExcludedCategories:setExcludedCategories,location:location,setLocation:setLocation,showFilters:showFilters,setShowFilters:setShowFilters,coords:coords,setCoords:setCoords};
  var rouletteProps={rouletteItems:rouletteItems,filteredPlaces:filteredPlaces,spinning:spinning,setSpinning:setSpinning,winner:winner,setWinner:setWinner,showOverlay:showOverlay,setShowOverlay:setShowOverlay,fortune:fortune,setFortune:setFortune,charMood:charMood,setCharMood:setCharMood,tab:placeTab,filterProps:filterProps,loading:loading,onRefresh:onRefresh,verifiedMode:verifiedMode,setVerifiedMode:setVerifiedMode,verifying:verifying,totalPages:totalPages,currentPage:currentPage};

  var tabs=[{id:"restaurant",label:"\uD83C\uDF7D 음식점"},{id:"cafe",label:"\u2615 카페"},{id:"custom",label:"\u270F\uFE0F 직접 입력"}];

  return React.createElement("div",{style:{maxWidth:420,margin:"0 auto",padding:"0 4px 2rem",fontFamily:"'Apple SD Gothic Neo','Pretendard',system-ui,sans-serif"}},
    React.createElement("style",null,"@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes cardPop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}@keyframes overlayIn{from{opacity:0}to{opacity:1}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(380px) rotate(720deg);opacity:0}}@keyframes wiggle{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}@keyframes armPush{0%{transform:rotate(0deg)}100%{transform:rotate(-12deg)}}@keyframes armWave{0%{transform:rotate(0deg)}100%{transform:rotate(10deg)}}"),
    React.createElement("div",{style:{display:"flex",background:"#F5F4EF",borderRadius:50,padding:3,margin:"16px 0 14px"}},
      tabs.map(function(t){return React.createElement("button",{key:t.id,onClick:function(){onTabChange(t.id);},style:{flex:1,padding:"10px 0",borderRadius:50,border:"none",background:mainTab===t.id?"#fff":"transparent",color:mainTab===t.id?"#2C2C2A":"#888780",fontWeight:mainTab===t.id?600:400,fontSize:13,cursor:"pointer",transition:"all 0.2s",boxShadow:mainTab===t.id?"0 1px 4px rgba(0,0,0,0.06)":"none"}},t.label);})),
    mainTab==="custom"?React.createElement(CustomTab):React.createElement(PlaceRoulette,rouletteProps));
}
