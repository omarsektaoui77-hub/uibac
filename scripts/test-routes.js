const routes = [
  "/", 
  "/en",
  "/fr",
  "/ar",
  "/es"
];

const invalidRoutes = [
  "/ar/es"
];

const baseUrl = "http://localhost:3000";

async function testRoute(path) {
  try {
    const res = await fetch(baseUrl + path, {
      redirect: "manual"
    });

    return {
      path,
      status: res.status,
      ok: res.status === 200 || res.status === 307 || res.status === 308
    };
  } catch (err) {
    return { path, status: "ERROR", ok: false };
  }
}

(async () => {
  console.log("🚀 Testing VALID routes...\n");

  for (const route of routes) {
    const result = await testRoute(route);
    console.log(
      `${result.ok ? "✅" : "❌"} ${route} → ${result.status}` 
    );
  }

  console.log("\n🚫 Testing INVALID routes...\n");

  for (const route of invalidRoutes) {
    const result = await testRoute(route);
    const isCorrect = result.status === 404;

    console.log(
      `${isCorrect ? "✅" : "❌"} ${route} → ${result.status}` 
    );
  }

  console.log("\n🎯 Test completed.\n");
})();
