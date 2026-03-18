import { useState, useEffect, useRef, useCallback } from "react";

/* ── Config ── */
const API_BASE = "https://dolryeo-meokja.vercel.app";

/* ── Data ── */
const FOOD_CATEGORIES=[{id:"all",label:"전체"},{id:"korean",label:"한식"},{id:"chinese",label:"중식"},{id:"japanese",label:"일식"},{id:"western",label:"양식"},{id:"chicken",label:"치킨"},{id:"pizza",label:"피자"},{id:"burger",label:"버거"},{id:"asian",label:"아시안"},{id:"bunsik",label:"분식"},{id:"meat",label:"고기/구이"},{id:"seafood",label:"해산물"}];
const CAFE_CATEGORIES=[{id:"all",label:"전체"},{id:"coffee",label:"커피전문점"},{id:"dessert",label:"디저트카페"},{id:"bakery",label:"베이커리"},{id:"tea",label:"차/주스"}];
const RADIUS_OPTIONS=[{value:300,label:"300m"},{value:500,label:"500m"},{value:700,label:"700m"},{value:1000,label:"1km"}];
const RATING_OPTIONS=[{value:0,label:"전체"},{value:3.5,label:"3.5+"},{value:4.0,label:"4.0+"},{value:4.5,label:"4.5+"}];
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

/* ── Kakao API에서 카테고리 이름을 우리 카테고리 ID로 매핑 ── */
function mapCategory(categoryName){
  if(!categoryName) return "all";
  const cn = categoryName.toLowerCase();
  if(cn.includes("한식")||cn.includes("국밥")||cn.includes("백반")) return "korean";
  if(cn.includes("중식")||cn.includes("중국")) return "chinese";
  if(cn.includes("일식")||cn.includes("초밥")||cn.includes("일본")) return "japanese";
  if(cn.includes("양식")||cn.includes("이탈리")||cn.includes("프랑스")||cn.includes("파스타")||cn.includes("스테이크")) return "western";
  if(cn.includes("치킨")||cn.includes("닭")) return "chicken";
  if(cn.includes("피자")) return "pizza";
  if(cn.includes("버거")||cn.includes("햄버거")) return "burger";
  if(cn.includes("아시안")||cn.includes("베트남")||cn.includes("태국")||cn.includes("인도")) return "asian";
  if(cn.includes("분식")||cn.includes("떡볶이")||cn.includes("김밥")) return "bunsik";
  if(cn.includes("고기")||cn.includes("구이")||cn.includes("삼겹")||cn.includes("갈비")||cn.includes("소고기")) return "meat";
  if(cn.includes("해산물")||cn.includes("횟집")||cn.includes("수산")||cn.includes("생선")) return "seafood";
  if(cn.includes("커피")) return "coffee";
  if(cn.includes("디저트")||cn.includes("케이크")||cn.includes("아이스크림")) return "dessert";
  if(cn.includes("베이커리")||cn.includes("빵")||cn.includes("제과")) return "bakery";
  if(cn.includes("차")||cn.includes("주스")||cn.includes("스무디")) return "tea";
  return "all";
}

/* ── API 호출 함수 ── */
async function fetchPlaces(type, x, y, radius) {
  const categoryCode = type === "cafe" ? "CE7" : "FD6";
  const allDocs = [];
  // 최대 3페이지까지 호출 (45개)
  for (let page = 1; page <= 3; page++) {
    try {
      const res = await fetch(
        `${API_BASE}/api/kakao-places?type=category&category_group_code=${categoryCode}&x=${x}&y=${y}&radius=${radius}&page=${page}&size=15`
      );
      if (!res.ok) break;
      const data = await res.json();
      if (data.documents) allDocs.push(...data.documents);
      if (data.meta?.is_end) break;
    } catch (e) {
      console.error("API 호출 에러:", e);
      break;
    }
  }
  // 카카오 응답을 우리 앱 형식으로 변환
  return allDocs.map((doc, i) => ({
    id: doc.id || `place-${i}`,
    name: doc.place_name || "이름 없음",
    category: mapCategory(doc.category_name),
    categoryName: doc.category_name || "",
    rating: "0",  // 카카오 API는 평점을 제공하지 않음
    reviewCount: 0,
    distance: parseInt(doc.distance) || 0,
    isOpen: true,  // 카카오 API는 영업 여부를 제공하지 않음
    address: doc.road_address_name || doc.address_name || "",
    phone: doc.phone || "",
    placeUrl: doc.place_url || "",
    x: doc.x,
    y: doc.y,
  }));
}

/* ═══ CHARACTERS ═══ */
function CharArms({mood="default",spinning=false,onClick,size=120}){
  const faces={
    default:(<><ellipse cx="68" cy="44" rx="3.5" ry="4.5" fill="#2C2C2A"/><ellipse cx="84" cy="44" rx="3.5" ry="4.5" fill="#2C2C2A"/><ellipse cx="68" cy="45" rx="1.3" ry="1.3" fill="#fff"/><ellipse cx="84" cy="45" rx="1.3" ry="1.3" fill="#fff"/><path d="M71 55 Q76 61 81 55" stroke="#2C2C2A" strokeWidth="2.2" fill="none" strokeLinecap="round"/><ellipse cx="59" cy="50" rx="5" ry="3" fill="#F5C4B3" opacity="0.55"/><ellipse cx="93" cy="50" rx="5" ry="3" fill="#F5C4B3" opacity="0.55"/></>),
    pushing:(<><ellipse cx="68" cy="44" rx="3.5" ry="4.5" fill="#2C2C2A"/><ellipse cx="84" cy="44" rx="3.5" ry="4.5" fill="#2C2C2A"/><ellipse cx="68" cy="45" rx="1.3" ry="1.3" fill="#fff"/><ellipse cx="84" cy="45" rx="1.3" ry="1.3" fill="#fff"/><ellipse cx="76" cy="57" rx="6" ry="4.5" fill="#2C2C2A"/><ellipse cx="76" cy="55.5" rx="4" ry="2.5" fill="#E24B4A" opacity="0.45"/><ellipse cx="59" cy="49" rx="5.5" ry="3.5" fill="#F5C4B3" opacity="0.65"/><ellipse cx="93" cy="49" rx="5.5" ry="3.5" fill="#F5C4B3" opacity="0.65"/></>),
    excited:(<><path d="M64 43 Q68 39 72 43" stroke="#2C2C2A" strokeWidth="2.2" fill="none" strokeLinecap="round"/><path d="M80 43 Q84 39 88 43" stroke="#2C2C2A" strokeWidth="2.2" fill="none" strokeLinecap="round"/><ellipse cx="76" cy="56" rx="7" ry="5" fill="#2C2C2A"/><ellipse cx="76" cy="54.5" rx="4.5" ry="2.5" fill="#E24B4A" opacity="0.45"/><ellipse cx="59" cy="49" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.7"/><ellipse cx="93" cy="49" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.7"/><path d="M48 28 L53 34 L44 32Z" fill="#FFD93D"/><path d="M104 28 L99 34 L108 32Z" fill="#FFD93D"/></>),
  };
  const s=spinning?"pushing":mood==="excited"?"excited":"default";
  return(<svg width={size} height={size*0.8} viewBox="0 0 140 100" fill="none" onClick={onClick} style={{cursor:"pointer",overflow:"visible"}}>
    <g style={{transformOrigin:"42px 50px",animation:spinning?"armPush 0.35s ease infinite alternate":"none"}}><path d="M42 50 Q24 42 12 38" stroke="#F5C775" strokeWidth="6" fill="none" strokeLinecap="round"/><circle cx="12" cy="37" r="5.5" fill="#FFE8A3" stroke="#F5C775" strokeWidth="1.5"/></g>
    <g style={{transformOrigin:"110px 50px",animation:spinning?"armWave 0.5s ease infinite alternate":"none"}}><path d="M110 50 Q120 40 126 32" stroke="#F5C775" strokeWidth="6" fill="none" strokeLinecap="round"/><circle cx="126" cy="31" r="4.5" fill="#FFE8A3" stroke="#F5C775" strokeWidth="1.5"/></g>
    <circle cx="76" cy="46" r="30" fill="#FFE8A3"/><circle cx="76" cy="46" r="30" stroke="#F5C775" strokeWidth="2"/>
    <ellipse cx="64" cy="78" rx="8" ry="5" fill="#FFE8A3" stroke="#F5C775" strokeWidth="1.5"/><ellipse cx="88" cy="78" rx="8" ry="5" fill="#FFE8A3" stroke="#F5C775" strokeWidth="1.5"/>
    {faces[s]}</svg>);
}
function CharHead({mood="default",size=100}){
  const faces={
    default:(<><ellipse cx="38" cy="52" rx="4" ry="5" fill="#2C2C2A"/><ellipse cx="62" cy="52" rx="4" ry="5" fill="#2C2C2A"/><ellipse cx="38" cy="53" rx="1.5" ry="1.5" fill="#fff"/><ellipse cx="62" cy="53" rx="1.5" ry="1.5" fill="#fff"/><path d="M44 63 Q50 70 56 63" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round"/><ellipse cx="28" cy="58" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.6"/><ellipse cx="72" cy="58" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.6"/></>),
    excited:(<><path d="M33 50 Q38 46 43 50" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round"/><path d="M57 50 Q62 46 67 50" stroke="#2C2C2A" strokeWidth="2.5" fill="none" strokeLinecap="round"/><ellipse cx="50" cy="65" rx="8" ry="6" fill="#2C2C2A"/><ellipse cx="50" cy="63" rx="5" ry="3" fill="#E24B4A" opacity="0.5"/><ellipse cx="28" cy="56" rx="7" ry="4" fill="#F5C4B3" opacity="0.7"/><ellipse cx="72" cy="56" rx="7" ry="4" fill="#F5C4B3" opacity="0.7"/><path d="M16 34 L22 40 L12 38Z" fill="#FFD93D"/><path d="M84 34 L78 40 L88 38Z" fill="#FFD93D"/></>),
    thinking:(<><ellipse cx="38" cy="52" rx="4" ry="5" fill="#2C2C2A"/><ellipse cx="62" cy="52" rx="4" ry="5" fill="#2C2C2A"/><ellipse cx="39" cy="53" rx="1.5" ry="1.5" fill="#fff"/><ellipse cx="63" cy="53" rx="1.5" ry="1.5" fill="#fff"/><path d="M45 65 Q50 62 55 65" stroke="#2C2C2A" strokeWidth="2" fill="none" strokeLinecap="round"/><ellipse cx="28" cy="58" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.5"/><ellipse cx="72" cy="58" rx="6" ry="3.5" fill="#F5C4B3" opacity="0.5"/><circle cx="78" cy="32" r="2.5" fill="#B4B2A9" opacity="0.5"/><circle cx="83" cy="26" r="3.5" fill="#B4B2A9" opacity="0.4"/></>),
  };
  return(<svg width={size} height={size} viewBox="0 0 100 100" fill="none"><circle cx="50" cy="52" r="34" fill="#FFE8A3"/><circle cx="50" cy="52" r="34" stroke="#F5C775" strokeWidth="2"/>{faces[mood]}</svg>);
}

/* ═══ SHARED UI ═══ */
function Confetti(){const colors=["#534AB7","#1D9E75","#D85A30","#378ADD","#D4537E","#FFD93D","#E24B4A","#639922"];const p=useRef(Array.from({length:40},(_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*0.6,dur:1.2+Math.random()*1,sz:4+Math.random()*6,col:colors[i%colors.length],rot:Math.random()*360}))).current;return(<div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",overflow:"hidden",borderRadius:24}}>{p.map(c=><div key={c.id} style={{position:"absolute",left:`${c.x}%`,top:"-8px",width:c.sz,height:c.sz*0.6,background:c.col,borderRadius:1,transform:`rotate(${c.rot}deg)`,animation:`confettiFall ${c.dur}s ${c.delay}s ease-in forwards`}}/>)}</div>);}

function RouletteWheel({items,spinning,onStop,canvasSize=280,pointerSide="top"}){
  const canvasRef=useRef(null),angleRef=useRef(0),speedRef=useRef(0),animRef=useRef(null);
  const pc=["#AFA9EC","#9FE1CB","#F5C4B3","#85B7EB","#ED93B1","#C0DD97","#FAC775","#F7C1C1","#CECBF6","#5DCAA5","#F0997B","#B5D4F4"];
  const tc=["#3C3489","#085041","#712B13","#0C447C","#72243E","#27500A","#633806","#791F1F","#26215C","#04342C","#4A1B0C","#042C53"];
  const pA=pointerSide==="left"?Math.PI:Math.PI/2;
  const draw=useCallback(()=>{const cv=canvasRef.current;if(!cv||!items.length)return;const ctx=cv.getContext("2d");const dpr=window.devicePixelRatio||1;cv.width=canvasSize*dpr;cv.height=canvasSize*dpr;cv.style.width=canvasSize+"px";cv.style.height=canvasSize+"px";ctx.scale(dpr,dpr);const c=canvasSize/2,r=c-14,sa=(2*Math.PI)/items.length;ctx.clearRect(0,0,canvasSize,canvasSize);ctx.beginPath();ctx.arc(c,c,r+8,0,2*Math.PI);ctx.fillStyle="#FFE8A3";ctx.fill();ctx.strokeStyle="#F5C775";ctx.lineWidth=2;ctx.stroke();for(let i=0;i<items.length*2;i++){const a=(i/(items.length*2))*2*Math.PI;ctx.beginPath();ctx.arc(c+(r+4)*Math.cos(a),c+(r+4)*Math.sin(a),2.2,0,2*Math.PI);ctx.fillStyle=i%2===0?"#E24B4A":"#fff";ctx.fill();}items.forEach((item,i)=>{const s=angleRef.current+i*sa;ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,s,s+sa);ctx.closePath();ctx.fillStyle=pc[i%pc.length];ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2.5;ctx.stroke();ctx.save();ctx.translate(c,c);ctx.rotate(s+sa/2);ctx.fillStyle=tc[i%tc.length];ctx.font=`600 ${items.length>10?9.5:11.5}px 'Apple SD Gothic Neo','Pretendard',system-ui,sans-serif`;ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillText(item.name.length>7?item.name.slice(0,6)+"..":item.name,r-14,0);ctx.restore();});ctx.beginPath();ctx.arc(c,c,26,0,2*Math.PI);ctx.fillStyle="#FFE8A3";ctx.fill();ctx.strokeStyle="#F5C775";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(c,c,19,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();ctx.font="700 9px 'Apple SD Gothic Neo',system-ui";ctx.fillStyle="#BA7517";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("SPIN",c,c);if(pointerSide==="top"){const py=6;ctx.beginPath();ctx.moveTo(c,py+12);ctx.lineTo(c-10,py);ctx.lineTo(c+10,py);ctx.closePath();ctx.fillStyle="#E24B4A";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(c,py+4,2.5,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();}else{const px=6;ctx.beginPath();ctx.moveTo(px+12,c);ctx.lineTo(px,c-10);ctx.lineTo(px,c+10);ctx.closePath();ctx.fillStyle="#E24B4A";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(px+4,c,2.5,0,2*Math.PI);ctx.fillStyle="#fff";ctx.fill();}},[items,canvasSize,pointerSide]);
  useEffect(()=>{if(spinning){speedRef.current=0.22+Math.random()*0.08;const a=()=>{angleRef.current+=speedRef.current;draw();animRef.current=requestAnimationFrame(a);};a();}else if(speedRef.current>0){const d=()=>{speedRef.current*=0.984;if(speedRef.current<0.0015){speedRef.current=0;cancelAnimationFrame(animRef.current);const sa=(2*Math.PI)/items.length;const n=((2*Math.PI-(angleRef.current%(2*Math.PI)))+pA)%(2*Math.PI);onStop(items[Math.floor(n/sa)%items.length]);draw();return;}angleRef.current+=speedRef.current;draw();animRef.current=requestAnimationFrame(d);};d();}return()=>{if(animRef.current)cancelAnimationFrame(animRef.current);};},[spinning]);
  useEffect(()=>{draw();},[items,draw]);
  return <canvas ref={canvasRef} style={{width:canvasSize,height:canvasSize,display:"block"}}/>;
}

function InfoPill({icon,text,isOpen}){const icons={star:<svg width="12" height="12" viewBox="0 0 24 24" fill="#F5C775"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,pin:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,clock:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOpen?"#1D9E75":"#E24B4A"} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>};return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:"#F9F8F5",fontSize:12,color:"#5F5E5A"}}>{icons[icon]} {text}</span>;}

function WinnerOverlay({winner,onRetry,onNavigate,onClose,fortune,isCustom}){if(!winner)return null;return(<div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,animation:"overlayIn 0.25s ease",padding:20}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:24,padding:"28px 24px 24px",width:"100%",maxWidth:340,position:"relative",animation:"cardPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden"}}><Confetti/><div style={{textAlign:"center",position:"relative",zIndex:1}}><CharHead mood="excited" size={80}/><div style={{fontSize:14,color:"#BA7517",fontWeight:600,margin:"8px 0 4px"}}>{fortune}</div><div style={{fontSize:22,fontWeight:700,color:"#2C2C2A",margin:"4px 0 16px"}}>{winner.name}</div>{!isCustom&&<div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:8}}><InfoPill icon="pin" text={`${winner.distance}m`}/>{winner.phone&&<InfoPill icon="clock" text={winner.phone} isOpen={true}/>}</div>}{!isCustom&&<div style={{fontSize:12,color:"#888780",margin:"8px 0 4px"}}>{winner.address}</div>}{!isCustom&&winner.categoryName&&<div style={{fontSize:11,color:"#B4B2A9",margin:"0 0 16px"}}>{winner.categoryName}</div>}<div style={{display:"flex",gap:10,marginTop:isCustom?16:0}}><button onClick={onRetry} style={{flex:1,padding:"13px 0",borderRadius:50,border:"2px solid #EEEDFE",background:"#FAFAFE",color:"#534AB7",fontSize:14,fontWeight:600,cursor:"pointer"}}>다시 돌리기</button>{!isCustom&&<button onClick={onNavigate} style={{flex:1,padding:"13px 0",borderRadius:50,border:"none",background:"#1EC800",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>네이버 지도</button>}</div></div></div></div>);}

function WinnerCardInline({winner,onRetry,onNavigate,fortune,isCustom}){if(!winner)return null;return(<div style={{background:"#FFFCF2",border:"2px solid #FFE8A3",borderRadius:20,padding:20,margin:"20px 0",textAlign:"center",animation:"fadeSlideUp 0.4s ease"}}><div style={{fontSize:13,color:"#BA7517",fontWeight:600,marginBottom:2}}>{fortune}</div><div style={{fontSize:18,fontWeight:700,color:"#2C2C2A",marginBottom:12}}>{winner.name}</div>{!isCustom&&<div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:8}}><InfoPill icon="pin" text={`${winner.distance}m`}/>{winner.phone&&<InfoPill icon="clock" text={winner.phone} isOpen={true}/>}</div>}{!isCustom&&<div style={{fontSize:12,color:"#888780",marginBottom:4}}>{winner.address}</div>}{!isCustom&&winner.categoryName&&<div style={{fontSize:11,color:"#B4B2A9",marginBottom:12}}>{winner.categoryName}</div>}<div style={{display:"flex",gap:10,marginTop:isCustom?8:0}}><button onClick={onRetry} style={{flex:1,padding:"12px 0",borderRadius:50,border:"2px solid #EEEDFE",background:"#fff",color:"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer"}}>다시 돌리기</button>{!isCustom&&<button onClick={onNavigate} style={{flex:1,padding:"12px 0",borderRadius:50,border:"none",background:"#1EC800",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>네이버 지도</button>}</div></div>);}

function FilterChip({selected,onClick,children}){return <button onClick={onClick} style={{padding:"7px 14px",borderRadius:50,border:selected?"2px solid #AFA9EC":"1.5px solid #E8E7E1",background:selected?"#EEEDFE":"#fff",color:selected?"#534AB7":"#888780",fontSize:13,fontWeight:selected?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s ease"}}>{children}</button>;}

/* ═══ LOCATION PICKER ═══ */
function LocationPicker({location,setLocation,coords,setCoords}){
  const [open,setOpen]=useState(false);const [customInput,setCustomInput]=useState("");const [gpsLoading,setGpsLoading]=useState(false);const [gpsError,setGpsError]=useState("");const panelRef=useRef(null);
  useEffect(()=>{const handler=e=>{if(panelRef.current&&!panelRef.current.contains(e.target))setOpen(false);};if(open)document.addEventListener("mousedown",handler);return()=>document.removeEventListener("mousedown",handler);},[open]);
  const handleGPS=()=>{setGpsLoading(true);setGpsError("");if(!navigator.geolocation){setGpsError("GPS를 지원하지 않는 브라우저예요");setGpsLoading(false);return;}navigator.geolocation.getCurrentPosition(pos=>{const {latitude,longitude}=pos.coords;setCoords({x:longitude,y:latitude});setLocation(`현재 위치`);setGpsLoading(false);setOpen(false);},err=>{setGpsError(err.code===1?"위치 권한을 허용해주세요":"위치를 가져올 수 없어요");setGpsLoading(false);},{enableHighAccuracy:true,timeout:8000});};
  const handleCustom=()=>{const v=customInput.trim();if(v){setLocation(v);setCustomInput("");setOpen(false);}};
  const handlePreset=(loc)=>{setLocation(loc.label);setCoords({x:loc.x,y:loc.y});setOpen(false);};
  return(
    <div ref={panelRef} style={{position:"relative",marginBottom:10}}>
      <div onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#F9F8F5",borderRadius:50,fontSize:13,cursor:"pointer",border:open?"1.5px solid #AFA9EC":"1.5px solid transparent",transition:"border 0.15s"}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span style={{color:"#2C2C2A",fontWeight:500,flex:1}}>{location}</span>
        <span style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fontSize:10,color:"#B4B2A9"}}>&#9660;</span>
      </div>
      {open&&(<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:20,border:"1.5px solid #E8E7E1",padding:12,zIndex:50,animation:"fadeSlideUp 0.15s ease",boxShadow:"0 8px 24px rgba(0,0,0,0.08)"}}>
        <button onClick={handleGPS} disabled={gpsLoading} style={{width:"100%",padding:"10px 14px",borderRadius:50,border:"1.5px solid #EEEDFE",background:"#FAFAFE",color:"#534AB7",fontSize:13,fontWeight:600,cursor:gpsLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          {gpsLoading?"위치 찾는 중...":"현재 위치 사용하기"}</button>
        {gpsError&&<div style={{fontSize:12,color:"#E24B4A",textAlign:"center",marginBottom:8}}>{gpsError}</div>}
        <div style={{display:"flex",gap:6,marginBottom:12}}><input value={customInput} onChange={e=>setCustomInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleCustom();}} placeholder="직접 입력 (예: 강남역, 홍대입구)" style={{flex:1,padding:"9px 14px",borderRadius:50,border:"1.5px solid #E8E7E1",fontSize:12,outline:"none",color:"#2C2C2A",background:"#fff"}}/><button onClick={handleCustom} disabled={!customInput.trim()} style={{padding:"9px 16px",borderRadius:50,border:"none",background:customInput.trim()?"#534AB7":"#E8E7E1",color:customInput.trim()?"#fff":"#B4B2A9",fontSize:12,fontWeight:600,cursor:customInput.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>설정</button></div>
        <div style={{fontSize:11,color:"#B4B2A9",fontWeight:500,marginBottom:8,paddingLeft:4}}>자주 찾는 장소</div>
        <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:200,overflowY:"auto"}}>{PRESET_LOCATIONS.map((loc,i)=>(
          <button key={i} onClick={()=>handlePreset(loc)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,border:"none",background:location===loc.label?"#EEEDFE":"transparent",cursor:"pointer",textAlign:"left",transition:"background 0.1s",width:"100%"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={location===loc.label?"#534AB7":"#B4B2A9"} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div><div style={{fontSize:13,fontWeight:500,color:location===loc.label?"#534AB7":"#2C2C2A"}}>{loc.label}</div><div style={{fontSize:11,color:"#B4B2A9"}}>{loc.sub}</div></div></button>))}</div>
      </div>)}
    </div>);
}

/* ═══ FILTERS ═══ */
function FiltersSection({tab,radius,setRadius,excludedCategories,setExcludedCategories,location,setLocation,showFilters,setShowFilters,coords,setCoords}){
  const cats=tab==="restaurant"?FOOD_CATEGORIES:CAFE_CATEGORIES;
  const toggle=id=>{if(id==="all"){setExcludedCategories(new Set());return;}setExcludedCategories(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});};
  return(<><LocationPicker location={location} setLocation={setLocation} coords={coords} setCoords={setCoords}/>
    <button onClick={()=>setShowFilters(!showFilters)} style={{width:"100%",padding:"10px 16px",borderRadius:50,border:"1.5px solid #E8E7E1",background:"#fff",color:"#5F5E5A",fontSize:13,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showFilters?10:16}}><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" style={{verticalAlign:"-2px",marginRight:6}}><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/><circle cx="6" cy="12" r="2" fill="#888"/><circle cx="10" cy="18" r="2" fill="#888"/><circle cx="8" cy="6" r="2" fill="#888"/></svg>검색 조건 설정</span><span style={{transform:showFilters?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fontSize:10,color:"#B4B2A9"}}>&#9660;</span></button>
    {showFilters&&<div style={{padding:16,background:"#FAFAF7",borderRadius:20,marginBottom:16,animation:"fadeSlideUp 0.2s ease",border:"1.5px solid #F0EFE8"}}>
      <div style={{marginBottom:14}}><div style={{fontSize:12,color:"#888780",marginBottom:8,fontWeight:600}}>반경 거리</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{RADIUS_OPTIONS.map(r=><FilterChip key={r.value} selected={radius===r.value} onClick={()=>setRadius(r.value)}>{r.label}</FilterChip>)}</div></div>
      <div><div style={{fontSize:12,color:"#888780",marginBottom:8,fontWeight:600}}>카테고리 (제외할 항목 선택)</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><FilterChip selected={excludedCategories.size===0} onClick={()=>toggle("all")}>전체</FilterChip>{cats.slice(1).map(c=><FilterChip key={c.id} selected={!excludedCategories.has(c.id)} onClick={()=>toggle(c.id)}>{c.label}</FilterChip>)}</div></div>
    </div>}</>);
}

/* ═══ PLACE ROULETTE ═══ */
function PlaceRoulette({rouletteItems,filteredPlaces,spinning,setSpinning,winner,setWinner,showOverlay,setShowOverlay,fortune,setFortune,charMood,setCharMood,tab,filterProps,loading}){
  const spin=()=>{if(rouletteItems.length<2)return;setWinner(null);setShowOverlay(false);setCharMood("pushing");const f=tab==="restaurant"?FORTUNES:CAFE_FORTUNES;setFortune(f[Math.floor(Math.random()*f.length)]);setSpinning(true);};
  const stop=()=>setSpinning(false);const onWin=w=>{setWinner(w);setShowOverlay(true);setCharMood("excited");};
  const nav=()=>{if(winner)window.open(`https://map.naver.com/v5/search/${encodeURIComponent(winner.name+" "+winner.address)}`,"_blank");};
  const retry=()=>{setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");};const charClick=()=>{if(spinning)stop();else spin();};
  return(<><div style={{textAlign:"center",padding:"20px 0 8px"}}><h1 style={{fontSize:22,fontWeight:700,color:"#2C2C2A",margin:0}}>{tab==="restaurant"?"오늘 뭐 먹지?":"어디서 마실까?"}</h1><p style={{fontSize:13,color:"#888780",margin:"2px 0 0"}}>고민은 룰렛에게 맡기세요</p></div>
    <FiltersSection {...filterProps}/>
    {loading?(<div style={{textAlign:"center",padding:"3rem 1rem"}}><div style={{animation:"wiggle 0.6s ease infinite",display:"inline-block"}}><CharArms mood="default" size={90}/></div><p style={{color:"#BA7517",fontSize:14,fontWeight:600,marginTop:12}}>주변 맛집을 찾고 있어요...</p></div>)
    :rouletteItems.length>=2?(<>{fortune&&!winner&&<div style={{textAlign:"center",marginBottom:8,animation:"fadeSlideUp 0.3s ease"}}><span style={{fontSize:15,fontWeight:600,color:"#BA7517"}}>{fortune}</span></div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",position:"relative",margin:"0 auto",maxWidth:420}}><div style={{position:"relative",zIndex:2,marginRight:-28,flexShrink:0,animation:spinning?"none":charMood==="excited"?"bounce 0.6s ease infinite":"none"}}><CharArms mood={charMood==="pushing"?"pushing":charMood} spinning={spinning} onClick={charClick} size={110}/></div><div style={{position:"relative",zIndex:1}}><RouletteWheel items={rouletteItems} spinning={spinning} onStop={onWin} canvasSize={260} pointerSide="left"/></div></div>
      <div style={{textAlign:"center",marginTop:8,opacity:winner?0:1,transition:"opacity 0.3s"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:50,background:"#FFFCF2",border:"1.5px solid #FFE8A3",fontSize:12,color:"#BA7517",fontWeight:500}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><rect x="3" y="11" width="18" height="11" rx="2"/></svg>{spinning?"다시 터치하면 멈춰요!":"캐릭터를 터치하면 손이 닿은 곳이 당첨!"}</span></div>
      {!winner&&<div style={{textAlign:"center",marginTop:12}}><button onClick={spinning?stop:spin} style={{padding:"10px 32px",borderRadius:50,border:spinning?"2px solid #F7C1C1":"2px solid #EEEDFE",background:spinning?"#FFF5F5":"#FAFAFE",color:spinning?"#E24B4A":"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer",animation:spinning?"pulse 0.7s ease infinite":"none"}}>{spinning?"멈추기":"또는 여기를 눌러 돌리기"}</button></div>}
      <WinnerCardInline winner={winner} onRetry={retry} onNavigate={nav} fortune={fortune}/></>):(<div style={{textAlign:"center",padding:"2.5rem 1rem"}}><CharArms mood="default" size={90}/><p style={{color:"#888780",fontSize:14,marginTop:12}}>주변에 장소가 부족해요</p><p style={{color:"#B4B2A9",fontSize:13}}>반경을 넓히거나 위치를 변경해보세요!</p></div>)}
    {rouletteItems.length>=2&&<div style={{textAlign:"center",fontSize:12,color:"#B4B2A9",marginTop:8}}>{filteredPlaces.length}개 중 {rouletteItems.length}곳 참여 중</div>}
    <WinnerOverlay winner={showOverlay?winner:null} onRetry={retry} onNavigate={nav} onClose={()=>setShowOverlay(false)} fortune={fortune}/></>);
}

/* ═══ CUSTOM TAB ═══ */
function CustomTab(){
  const [items,setItems]=useState(["짜장면","짬뽕","볶음밥","탕수육"]);const [input,setInput]=useState("");const [spinning,setSpinning]=useState(false);const [winner,setWinner]=useState(null);const [showOverlay,setShowOverlay]=useState(false);const [fortune,setFortune]=useState("");const [charMood,setCharMood]=useState("default");
  const addItem=()=>{const v=input.trim();if(v&&items.length<12&&!items.includes(v)){setItems([...items,v]);setInput("");}};const removeItem=i=>setItems(items.filter((_,idx)=>idx!==i));const rItems=items.map((name,i)=>({id:`c-${i}`,name}));
  const spin=()=>{if(rItems.length<2)return;setWinner(null);setShowOverlay(false);setCharMood("pushing");setFortune(CUSTOM_FORTUNES[Math.floor(Math.random()*CUSTOM_FORTUNES.length)]);setSpinning(true);};
  const stop=()=>setSpinning(false);const onWin=w=>{setWinner(w);setShowOverlay(true);setCharMood("excited");};const retry=()=>{setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");};const charClick=()=>{if(spinning)stop();else spin();};
  return(<><div style={{textAlign:"center",padding:"20px 0 8px"}}><h1 style={{fontSize:20,fontWeight:700,color:"#2C2C2A",margin:0}}>나만의 룰렛</h1><p style={{fontSize:13,color:"#888780",margin:"2px 0 0"}}>원하는 항목을 직접 입력하세요</p></div>
    <div style={{display:"flex",gap:8,marginBottom:12}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addItem();}} placeholder="항목 입력 (최대 12개)" maxLength={20} style={{flex:1,padding:"10px 16px",borderRadius:50,border:"1.5px solid #E8E7E1",background:"#fff",fontSize:13,outline:"none",color:"#2C2C2A"}}/><button onClick={addItem} disabled={!input.trim()||items.length>=12} style={{padding:"10px 20px",borderRadius:50,border:"none",background:input.trim()&&items.length<12?"#534AB7":"#E8E7E1",color:input.trim()&&items.length<12?"#fff":"#B4B2A9",fontSize:13,fontWeight:600,cursor:input.trim()&&items.length<12?"pointer":"not-allowed"}}>추가</button></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,minHeight:36}}>{items.map((item,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:50,background:"#EEEDFE",color:"#534AB7",fontSize:13,fontWeight:500}}>{item}<svg onClick={()=>removeItem(i)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" style={{cursor:"pointer",marginLeft:2}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>)}{items.length===0&&<span style={{fontSize:13,color:"#B4B2A9",padding:"6px 0"}}>항목을 추가해주세요</span>}</div>
    {rItems.length>=2?(<>{fortune&&!winner&&<div style={{textAlign:"center",marginBottom:8,animation:"fadeSlideUp 0.3s ease"}}><span style={{fontSize:15,fontWeight:600,color:"#BA7517"}}>{fortune}</span></div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",position:"relative",margin:"0 auto",maxWidth:420}}><div style={{position:"relative",zIndex:2,marginRight:-28,flexShrink:0,animation:spinning?"none":charMood==="excited"?"bounce 0.6s ease infinite":"none"}}><CharArms mood={charMood==="pushing"?"pushing":charMood} spinning={spinning} onClick={charClick} size={110}/></div><div style={{position:"relative",zIndex:1}}><RouletteWheel items={rItems} spinning={spinning} onStop={onWin} canvasSize={260} pointerSide="left"/></div></div>
      <div style={{textAlign:"center",marginTop:8,opacity:winner?0:1,transition:"opacity 0.3s"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:50,background:"#FFFCF2",border:"1.5px solid #FFE8A3",fontSize:12,color:"#BA7517",fontWeight:500}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BA7517" strokeWidth="2"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><rect x="3" y="11" width="18" height="11" rx="2"/></svg>{spinning?"다시 터치하면 멈춰요!":"캐릭터를 터치하면 손이 닿은 곳이 당첨!"}</span></div>
      {!winner&&<div style={{textAlign:"center",marginTop:12}}><button onClick={spinning?stop:spin} style={{padding:"10px 32px",borderRadius:50,border:spinning?"2px solid #F7C1C1":"2px solid #EEEDFE",background:spinning?"#FFF5F5":"#FAFAFE",color:spinning?"#E24B4A":"#534AB7",fontSize:13,fontWeight:600,cursor:"pointer",animation:spinning?"pulse 0.7s ease infinite":"none"}}>{spinning?"멈추기":"또는 여기를 눌러 돌리기"}</button></div>}
      <WinnerCardInline winner={winner} onRetry={retry} fortune={fortune} isCustom/></>):(<div style={{textAlign:"center",padding:"2rem 1rem"}}><CharArms mood="default" size={80}/><p style={{color:"#888780",fontSize:14,marginTop:12}}>항목을 2개 이상 추가하면 룰렛을 돌릴 수 있어요!</p></div>)}
    <WinnerOverlay winner={showOverlay?winner:null} onRetry={retry} onClose={()=>setShowOverlay(false)} fortune={fortune} isCustom/></>);
}

/* ═══ MAIN APP ═══ */
export default function App(){
  const [mainTab,setMainTab]=useState("restaurant");
  const [radius,setRadius]=useState(500);
  const [excludedCategories,setExcludedCategories]=useState(new Set());
  const [spinning,setSpinning]=useState(false);
  const [winner,setWinner]=useState(null);
  const [showOverlay,setShowOverlay]=useState(false);
  const [fortune,setFortune]=useState("");
  const [showFilters,setShowFilters]=useState(false);
  const [location,setLocation]=useState("강남역");
  const [coords,setCoords]=useState({x:127.0276,y:37.4979}); // 기본: 강남역
  const [allPlaces,setAllPlaces]=useState({restaurant:[],cafe:[]});
  const [charMood,setCharMood]=useState("default");
  const [loading,setLoading]=useState(false);

  // 위치, 반경, 탭 변경 시 API 호출
  useEffect(()=>{
    if(!coords.x||!coords.y) return;
    const loadPlaces=async()=>{
      setLoading(true);
      const placeTab=mainTab==="restaurant"||mainTab==="cafe"?mainTab:"restaurant";
      const data=await fetchPlaces(placeTab,coords.x,coords.y,radius);
      setAllPlaces(prev=>({...prev,[placeTab]:data}));
      setLoading(false);
    };
    loadPlaces();
  },[coords.x,coords.y,radius,mainTab]);

  const placeTab=mainTab==="restaurant"||mainTab==="cafe"?mainTab:"restaurant";
  const filteredPlaces=(allPlaces[placeTab]||[]).filter(p=>{
    if(excludedCategories.has(p.category)) return false;
    return true;
  });
  const rouletteItems=filteredPlaces.slice(0,12);
  const resetState=()=>{setWinner(null);setShowOverlay(false);setFortune("");setCharMood("default");setSpinning(false);};
  const onTabChange=t=>{setMainTab(t);resetState();setExcludedCategories(new Set());};
  const filterProps={tab:placeTab,radius,setRadius,excludedCategories,setExcludedCategories,location,setLocation,showFilters,setShowFilters,coords,setCoords};
  const rouletteProps={rouletteItems,filteredPlaces,spinning,setSpinning,winner,setWinner,showOverlay,setShowOverlay,fortune,setFortune,charMood,setCharMood,tab:placeTab,filterProps,loading};

  return(<div style={{maxWidth:420,margin:"0 auto",padding:"0 4px 2rem",fontFamily:"'Apple SD Gothic Neo','Pretendard',system-ui,sans-serif"}}>
    <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes cardPop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}@keyframes overlayIn{from{opacity:0}to{opacity:1}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(380px) rotate(720deg);opacity:0}}@keyframes wiggle{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}@keyframes armPush{0%{transform:rotate(0deg)}100%{transform:rotate(-12deg)}}@keyframes armWave{0%{transform:rotate(0deg)}100%{transform:rotate(10deg)}}`}</style>
    <div style={{display:"flex",background:"#F5F4EF",borderRadius:50,padding:3,margin:"16px 0 14px"}}>{[{id:"restaurant",label:"🍽 음식점"},{id:"cafe",label:"☕ 카페"},{id:"custom",label:"✏️ 직접 입력"}].map(t=><button key={t.id} onClick={()=>onTabChange(t.id)} style={{flex:1,padding:"10px 0",borderRadius:50,border:"none",background:mainTab===t.id?"#fff":"transparent",color:mainTab===t.id?"#2C2C2A":"#888780",fontWeight:mainTab===t.id?600:400,fontSize:13,cursor:"pointer",transition:"all 0.2s",boxShadow:mainTab===t.id?"0 1px 4px rgba(0,0,0,0.06)":"none"}}>{t.label}</button>)}</div>
    {mainTab==="custom"?<CustomTab/>:<PlaceRoulette {...rouletteProps}/>}
  </div>);
}
