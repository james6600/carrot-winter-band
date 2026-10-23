// 채팅 안전 필터: 금칙어(욕설·성적 표현) 차단, 개인정보 가리기, Claude로 한 번 더 검사.
// 어떤 필터도 완벽하지 않으므로 신고함과 운영진 열람이 함께 간다.

// 띄어쓰기·특수문자·자모 변형으로 우회한 것까지 잡기 위해 글자만 남기고 비교한다.
const BAD_KO = [
  "시발","씨발","씨팔","시팔","쉬발","쓰발","씨바","시바라","ㅅㅂ","ㅆㅂ","병신","븅신","빙신","ㅂㅅ","지랄","ㅈㄹ",
  "존나","ㅈㄴ","졸라","좆","좃","개새끼","개새","새끼","새꺄","쌔끼","미친놈","미친년","미친새","또라이","닥쳐","꺼져","엿먹",
  "느금","니미","니애미","니앰","엠창","애미","호로","걸레","창녀","창년","씹","쌍놈","쌍년","개년","개놈",
  "섹스","섹파","야동","야사","보지","자지","잦이","딸딸이","자위","강간","성관계","원나잇","조건만남","야한","음란","야스",
  "fuck","fucking","shit","bitch","asshole","dick","pussy","porn","sexy","nude","whore","slut",
];
// 영어는 단어 단위로만 (예: "assistant"의 ass는 통과)
const BAD_EN_WORD = new Set(["fuck","fucking","shit","bitch","asshole","dick","pussy","porn","nude","whore","slut","sex","cock"]);
const normalize = s => String(s || "").toLowerCase().replace(/[\s\-_.·'’"!?&,()\[\]~*^#@$%+=/\\|<>:;{}`]/g, "");

export function findBadWord(text){
  const n = normalize(text);
  for (const w of BAD_KO) if (w.length >= 2 && n.includes(w)) return w;
  for (const w of String(text || "").toLowerCase().split(/[^a-z]+/)) if (BAD_EN_WORD.has(w)) return w;
  return "";
}

// 전화번호·계좌번호·주민번호처럼 보이는 숫자열은 가린다 (교환은 모임에서 직접).
export function maskPII(text){
  return String(text || "")
    .replace(/\d{6}[-\s]?[1-4]\d{6}/g, "******-*******")
    .replace(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, m => m.slice(0, 3) + "-****-****")
    .replace(/\b\d{10,16}\b/g, m => m.slice(0, 3) + "*".repeat(m.length - 3))
    .replace(/\d{2,6}[-]\d{2,6}[-]\d{2,6}([-]\d{1,6})?/g, "***-****-****");
}

// Claude로 욕설·성희롱·혐오·괴롭힘·개인정보 요구를 한 번 더 본다. 키가 없거나 실패하면 통과(금칙어 필터는 이미 적용됨).
export async function aiCheck(text, timeoutMs = 4000){
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return { block: false, reason: "", checked: false };
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5", max_tokens: 60,
        system: "너는 동네 밴드 합주 모임 채팅의 안전 검사기다. 메시지 하나를 보고 차단할지 판단한다. "
          + "차단 대상: 욕설·비하, 성적인 표현이나 성희롱, 혐오·차별, 협박·괴롭힘, 외부 연락처·금전 요구를 집요하게 하는 것. "
          + "음악·합주·일정·장난스러운 농담·가벼운 불평은 통과. 애매하면 통과. "
          + '반드시 JSON으로만: {"block": true|false, "reason": "욕설|성적|혐오|괴롭힘|개인정보|"}',
        messages: [{ role: "user", content: "메시지:\n" + String(text).slice(0, 400) }],
      }),
    });
    if (!r.ok) return { block: false, reason: "", checked: false };
    const data = await r.json();
    const m = (data.content || []).map(c => c.text || "").join("").match(/\{[\s\S]*\}/);
    if (!m) return { block: false, reason: "", checked: false };
    const j = JSON.parse(m[0]);
    return { block: !!j.block, reason: String(j.reason || "").slice(0, 20), checked: true };
  } catch { return { block: false, reason: "", checked: false }; }
  finally { clearTimeout(t); }
}
