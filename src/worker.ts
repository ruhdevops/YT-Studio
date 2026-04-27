export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API ROUTE (D1)
    if (url.pathname.startsWith("/api/orders")) {
      const result = await env.MY_DB
        .prepare(`
          SELECT Id, CustomerName, OrderDate
          FROM [Order]
          ORDER BY OrderDate DESC
          LIMIT 100
        `)
        .all();

      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // STATIC FILES (DO NOT CHANGE UI)
    return env.ASSETS.fetch(request);
  }
};
