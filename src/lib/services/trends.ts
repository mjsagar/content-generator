import Parser from 'rss-parser';

export async function getLatestTrends() {
  const parser = new Parser();
  const trends: string[] = [];
  try {
    const feed = await parser.parseURL('https://trends.google.com/trending/rss?geo=GB');
    feed.items.forEach(item => {
      if (item.title) {
        trends.push(item.title);
      }
    });
  } catch (error) {
    console.error('Error fetching Google Trends RSS:', error);
  }
  return trends;
}
