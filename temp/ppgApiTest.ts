
const API_BASE = "http://10.82.126.182:5081/API_SUPPLIER_DISPATCH?api_type=from_query&type=json&page=1&db_conn_id=1"
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIyNTQ3NSIsImVtcF9ubyI6IjI1NDc1IiwibmJmIjoxNzQ4NTk4ODEwLCJleHAiOjE3ODAxMzQ4MTAsImlhdCI6MTc0ODU5ODgxMCwiaXNzIjoiVElFSV9BTVJVVCJ9.j_3xcNEVg4Hhxx90gvXIho0gd75yQBdEhGuzRMFJdZE"

export async function fetchProductEntryLogs(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/product-entry-logs`, {
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
      }
    })
    if (!response.ok) throw new Error("Failed to fetch product entry logs")
    return await response.json()
  } catch (error) {
    console.error("Error fetching:", error)
    return []
  }
}

fetchProductEntryLogs();