type OrderRow = {
  Id: string;
  CustomerName: string;
  OrderDate: number;
};

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const result = await env.MY_DB
      .prepare(`
        SELECT Id, CustomerName, OrderDate
        FROM [Order]
        ORDER BY OrderDate DESC
        LIMIT 100
      `)
      .all<OrderRow>();

    return new Response(JSON.stringify(result.results), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
