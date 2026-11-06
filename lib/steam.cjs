function score(positive, total) {
  if (!Number.isFinite(positive) || !Number.isFinite(total) || total < 10 || positive < 0 || positive > total) return null;
  // Wilson lower bound: uncertainty penalizes small review samples.
  const p = positive / total, z = 1.96;
  const lower = (p + z*z/(2*total) - z*Math.sqrt((p*(1-p)+z*z/(4*total))/total))/(1+z*z/total);
  const obscurity = Math.max(0, 1 - Math.log10(Math.max(total, 10))/5);
  return Math.round(100 * lower * (0.7 + 0.3*obscurity));
}
function normalize(d, reviews) {
  const summary = (reviews?.response ?? reviews)?.query_summary;
  const r = Number.isInteger(summary?.total_reviews) && summary.total_reviews >= 0
    && Number.isInteger(summary?.total_positive) && summary.total_positive >= 0
    && summary.total_positive <= summary.total_reviews ? summary : null;
  return {appId:d.steam_appid,title:d.name,image:d.header_image,description:d.short_description,
    genres:(d.genres||[]).map(x=>x.description),categories:(d.categories||[]).map(x=>({id:x.id,name:x.description})),
    release:d.release_date?.date,comingSoon:!!d.release_date?.coming_soon,developers:d.developers||[],publishers:d.publishers||[],
    screenshots:(d.screenshots||[]).slice(0,8).map(x=>x.path_thumbnail),free:!!d.is_free,price:d.price_overview?.final_formatted||null,
    metacritic:d.metacritic?.score??null,reviews:r?{total:r.total_reviews,positive:r.total_positive,percent:r.total_reviews?Math.round(100*r.total_positive/r.total_reviews):null,label:r.review_score_desc}:null,
    gemsScore:r?score(r.total_positive,r.total_reviews):null,players:null,duration:null,source:'Steam',url:`https://store.steampowered.com/app/${d.steam_appid}/`};
}
module.exports={score,normalize};
