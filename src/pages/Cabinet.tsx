import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import Icon from "@/components/ui/icon"
import {
  apiLogout, apiMe,
  apiGetEmployees, apiCreateEmployee, apiUpdateEmployee, apiDeleteEmployee,
  apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory,
} from "@/lib/api"

interface Employee { id: number; name: string; position: string; salary: number }
interface Category { id: number; name: string; rate: number }

export default function Cabinet() {
  const navigate = useNavigate()
  const [user, setUser] = React.useState<{ name: string; email: string } | null>(null)
  const [tab, setTab] = React.useState<"employees" | "categories">("employees")
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)

  // Employee form
  const [empForm, setEmpForm] = React.useState({ name: "", position: "", salary: "" })
  const [empEditing, setEmpEditing] = React.useState<number | null>(null)
  const [empError, setEmpError] = React.useState("")

  // Category form
  const [catForm, setCatForm] = React.useState({ name: "", rate: "" })
  const [catEditing, setCatEditing] = React.useState<number | null>(null)
  const [catError, setCatError] = React.useState("")

  React.useEffect(() => {
    const init = async () => {
      const res = await apiMe()
      if (res.error) { navigate("/login"); return }
      setUser(res.user)
      const [empRes, catRes] = await Promise.all([apiGetEmployees(), apiGetCategories()])
      setEmployees(empRes.employees || [])
      setCategories(catRes.categories || [])
      setLoading(false)
    }
    init()
  }, [navigate])

  const logout = async () => {
    await apiLogout()
    navigate("/login")
  }

  // Employees CRUD
  const saveEmployee = async () => {
    setEmpError("")
    if (!empForm.name.trim()) { setEmpError("Введите имя"); return }
    const data = { name: empForm.name, position: empForm.position, salary: parseFloat(empForm.salary) || 0 }
    if (empEditing !== null) {
      const res = await apiUpdateEmployee(empEditing, data)
      if (res.error) { setEmpError(res.error); return }
      setEmployees(employees.map((e) => e.id === empEditing ? res.employee : e))
    } else {
      const res = await apiCreateEmployee(data)
      if (res.error) { setEmpError(res.error); return }
      setEmployees([...employees, res.employee])
    }
    setEmpForm({ name: "", position: "", salary: "" })
    setEmpEditing(null)
  }

  const editEmployee = (e: Employee) => {
    setEmpEditing(e.id)
    setEmpForm({ name: e.name, position: e.position || "", salary: String(e.salary) })
    setEmpError("")
  }

  const deleteEmployee = async (id: number) => {
    await apiDeleteEmployee(id)
    setEmployees(employees.filter((e) => e.id !== id))
    if (empEditing === id) { setEmpEditing(null); setEmpForm({ name: "", position: "", salary: "" }) }
  }

  // Categories CRUD
  const saveCategory = async () => {
    setCatError("")
    if (!catForm.name.trim()) { setCatError("Введите название"); return }
    const data = { name: catForm.name, rate: parseFloat(catForm.rate) || 0 }
    if (catEditing !== null) {
      const res = await apiUpdateCategory(catEditing, data)
      if (res.error) { setCatError(res.error); return }
      setCategories(categories.map((c) => c.id === catEditing ? res.category : c))
    } else {
      const res = await apiCreateCategory(data)
      if (res.error) { setCatError(res.error); return }
      setCategories([...categories, res.category])
    }
    setCatForm({ name: "", rate: "" })
    setCatEditing(null)
  }

  const editCategory = (c: Category) => {
    setCatEditing(c.id)
    setCatForm({ name: c.name, rate: String(c.rate) })
    setCatError("")
  }

  const deleteCategory = async (id: number) => {
    await apiDeleteCategory(id)
    setCategories(categories.filter((c) => c.id !== id))
    if (catEditing === id) { setCatEditing(null); setCatForm({ name: "", rate: "" }) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-orange-200 bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-orange-500 rounded-lg p-1.5">
              <Icon name="Calculator" size={18} className="text-white" />
            </div>
            <span className="font-bold">ЗарплатаПро</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/cabinet/calc" className="flex items-center gap-1.5 text-sm font-medium rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 transition-colors">
              <Icon name="Calculator" size={15} />
              Расчёт зарплаты
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-500 transition-colors">
              <Icon name="LogOut" size={16} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Личный кабинет</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("employees")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "employees" ? "bg-orange-500 text-white" : "border border-input bg-background hover:bg-muted"}`}
          >
            <Icon name="Users" size={15} />
            Сотрудники
          </button>
          <button
            onClick={() => setTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "categories" ? "bg-orange-500 text-white" : "border border-input bg-background hover:bg-muted"}`}
          >
            <Icon name="Wrench" size={15} />
            Виды выработки
          </button>
        </div>

        {/* Employees Tab */}
        {tab === "employees" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 rounded-2xl border border-orange-200 bg-card p-6 space-y-4 h-fit">
              <h2 className="font-semibold">{empEditing !== null ? "Редактировать" : "Добавить сотрудника"}</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">ФИО</label>
                  <input type="text" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Иванов Иван Иванович"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Должность</label>
                  <input type="text" value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })} placeholder="Автомеханик"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Оклад (₽)</label>
                  <input type="number" value={empForm.salary} onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })} placeholder="30000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
              </div>
              {empError && <div className="text-sm text-red-500">{empError}</div>}
              <div className="flex gap-2">
                <button onClick={saveEmployee} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2">
                  <Icon name={empEditing !== null ? "Save" : "Plus"} size={15} />
                  {empEditing !== null ? "Сохранить" : "Добавить"}
                </button>
                {empEditing !== null && (
                  <button onClick={() => { setEmpEditing(null); setEmpForm({ name: "", position: "", salary: "" }); setEmpError("") }}
                    className="rounded-xl border border-input bg-background hover:bg-muted px-3 py-2.5 transition-colors">
                    <Icon name="X" size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-3 space-y-3">
              {employees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 p-12 text-center text-muted-foreground text-sm">
                  Сотрудников пока нет. Добавьте первого.
                </div>
              ) : employees.map((emp) => (
                <div key={emp.id} className="rounded-2xl border border-orange-200 bg-card px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">{emp.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {emp.position && <span>{emp.position} · </span>}
                      <span>{emp.salary.toLocaleString("ru-RU")} ₽/мес</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editEmployee(emp)} className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 text-muted-foreground hover:text-orange-500 transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => deleteEmployee(emp.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {tab === "categories" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 rounded-2xl border border-orange-200 bg-card p-6 space-y-4 h-fit">
              <h2 className="font-semibold">{catEditing !== null ? "Редактировать" : "Добавить вид выработки"}</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Название</label>
                  <input type="text" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Кузовной ремонт"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Ставка (%)</label>
                  <input type="number" value={catForm.rate} onChange={(e) => setCatForm({ ...catForm, rate: e.target.value })} placeholder="20"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2" />
                </div>
              </div>
              {catError && <div className="text-sm text-red-500">{catError}</div>}
              <div className="flex gap-2">
                <button onClick={saveCategory} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2">
                  <Icon name={catEditing !== null ? "Save" : "Plus"} size={15} />
                  {catEditing !== null ? "Сохранить" : "Добавить"}
                </button>
                {catEditing !== null && (
                  <button onClick={() => { setCatEditing(null); setCatForm({ name: "", rate: "" }); setCatError("") }}
                    className="rounded-xl border border-input bg-background hover:bg-muted px-3 py-2.5 transition-colors">
                    <Icon name="X" size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-3 space-y-3">
              {categories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 p-12 text-center text-muted-foreground text-sm">
                  Видов выработки пока нет. Добавьте первый.
                </div>
              ) : categories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-orange-200 bg-card px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-sm">{cat.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Ставка: {cat.rate}%</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editCategory(cat)} className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 text-muted-foreground hover:text-orange-500 transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}