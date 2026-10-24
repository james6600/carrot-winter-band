// 공연 상태 도우미 (api/shows.js, api/proposals.js, api/backstage.js가 함께 쓴다)
export const SHOW_STATUS = ["recruiting", "closed", "confirmed", "done"];
export const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
// 팀 모집이 지금 열려 있는지: '모집 중' 상태이고 모집 기간 안
export function recruitOpen(show, today = todayKst()){
  if (!show || show.status !== "recruiting") return false;
  if (show.recruitStart && today < show.recruitStart) return false;
  if (show.recruitEnd && today > show.recruitEnd) return false;
  return true;
}
