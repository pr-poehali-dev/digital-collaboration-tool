const URLS = {
  auth: "https://functions.poehali.dev/7550674b-e90d-4cef-9d9b-da43bc74126d",
  employees: "https://functions.poehali.dev/392c556c-a82b-4ade-85b4-8b897ce8dfa1",
  workCategories: "https://functions.poehali.dev/3c38ccb8-d35d-4422-b77c-35a0f83660ff",
}

function getToken() {
  return localStorage.getItem("token") || ""
}

function authHeaders() {
  return { "Content-Type": "application/json", "X-Session-Token": getToken() }
}

export async function apiRegister(email: string, password: string, name: string) {
  const r = await fetch(URLS.auth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "register", email, password, name }),
  })
  return r.json()
}

export async function apiLogin(email: string, password: string) {
  const r = await fetch(URLS.auth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  })
  return r.json()
}

export async function apiMe() {
  const r = await fetch(URLS.auth, {
    method: "GET",
    headers: authHeaders(),
  })
  return r.json()
}

export async function apiLogout() {
  await fetch(URLS.auth, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action: "logout" }),
  })
  localStorage.removeItem("token")
}

// Employees
export async function apiGetEmployees() {
  const r = await fetch(URLS.employees, { headers: authHeaders() })
  return r.json()
}

export async function apiCreateEmployee(data: { name: string; position: string; salary: number }) {
  const r = await fetch(URLS.employees, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function apiUpdateEmployee(id: number, data: { name: string; position: string; salary: number }) {
  const r = await fetch(URLS.employees + "?id=" + id, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function apiDeleteEmployee(id: number) {
  const r = await fetch(URLS.employees + "?id=" + id, {
    method: "DELETE",
    headers: authHeaders(),
  })
  return r.json()
}

// Work categories
export async function apiGetCategories() {
  const r = await fetch(URLS.workCategories, { headers: authHeaders() })
  return r.json()
}

export async function apiCreateCategory(data: { name: string; rate: number }) {
  const r = await fetch(URLS.workCategories, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function apiUpdateCategory(id: number, data: { name: string; rate: number }) {
  const r = await fetch(URLS.workCategories + "?id=" + id, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function apiDeleteCategory(id: number) {
  const r = await fetch(URLS.workCategories + "?id=" + id, {
    method: "DELETE",
    headers: authHeaders(),
  })
  return r.json()
}