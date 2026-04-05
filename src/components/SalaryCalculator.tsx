import * as React from "react"
import Icon from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { apiGetEmployees, apiGetCategories } from "@/lib/api"

interface WorkCategory {
  id: string
  name: string
  amount: number
  rate: number
}

interface CalculationResult {
  gross: number
  ndfl: number
  net: number
  worktotal: number
}

interface SavedEmployee { id: number; name: string; position: string; salary: number }
interface SavedCategory { id: number; name: string; rate: number }

export default function SalaryCalculator() {
  const [employeeName, setEmployeeName] = React.useState("")
  const [position, setPosition] = React.useState("")
  const [salary, setSalary] = React.useState("")
  const [categories, setCategories] = React.useState<WorkCategory[]>([
    { id: "1", name: "Кузовной ремонт", amount: 0, rate: 20 },
    { id: "2", name: "Слесарные работы", amount: 0, rate: 15 },
  ])
  const [result, setResult] = React.useState<CalculationResult | null>(null)

  // Справочники
  const [savedEmployees, setSavedEmployees] = React.useState<SavedEmployee[]>([])
  const [savedCategories, setSavedCategories] = React.useState<SavedCategory[]>([])
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsLoggedIn(true)
    apiGetEmployees().then((res) => { if (res.employees) setSavedEmployees(res.employees) })
    apiGetCategories().then((res) => { if (res.categories) setSavedCategories(res.categories) })
  }, [])

  // Закрытие дропдауна при клике вне
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEmployeeDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const selectEmployee = (emp: SavedEmployee) => {
    setEmployeeName(emp.name)
    setPosition(emp.position || "")
    setSalary(String(emp.salary))
    setShowEmployeeDropdown(false)
    setResult(null)
  }

  const loadCategoriesFromSaved = () => {
    if (savedCategories.length === 0) return
    setCategories(savedCategories.map((c) => ({ id: String(c.id), name: c.name, amount: 0, rate: c.rate })))
    setResult(null)
  }

  const addCategory = () => {
    setCategories([...categories, { id: Date.now().toString(), name: "", amount: 0, rate: 10 }])
  }

  const removeCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id))
  }

  const updateCategory = (id: string, field: keyof WorkCategory, value: string | number) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const calculate = () => {
    const baseSalary = parseFloat(salary) || 0
    const workTotal = categories.reduce((sum, c) => sum + (c.amount * c.rate) / 100, 0)
    const gross = baseSalary + workTotal
    const ndfl = Math.round(gross * 0.13)
    const net = Math.round(gross - ndfl)
    setResult({ gross: Math.round(gross), ndfl, net, worktotal: Math.round(workTotal) })
  }

  const printResult = () => {
    const name = employeeName || "Сотрудник"
    const baseSalary = parseFloat(salary) || 0
    const details = categories
      .filter((c) => c.amount > 0)
      .map((c) => `<tr><td>${c.name || "Без названия"} (${c.rate}%)</td><td style="text-align:right">+${Math.round((c.amount * c.rate) / 100).toLocaleString("ru-RU")} ₽</td></tr>`)
      .join("")
    const html = `
      <html><head><meta charset="utf-8"><title>Расчёт зарплаты — ${name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 480px; margin: 40px auto; color: #111; }
        h2 { color: #f97316; } hr { border: none; border-top: 1px solid #f97316; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 6px 0; } td:last-child { text-align: right; font-weight: 600; }
        .total { font-size: 24px; font-weight: 700; color: #f97316; }
        .ndfl { color: #ef4444; }
        .label { color: #888; font-size: 12px; margin-bottom: 4px; }
      </style></head>
      <body>
        <h2>Расчёт зарплаты</h2>
        <p><strong>${name}</strong>${position ? `<br/><span style="color:#888;font-size:13px">${position}</span>` : ""}</p><hr/>
        <table>
          <tr><td>Оклад</td><td>${baseSalary.toLocaleString("ru-RU")} ₽</td></tr>
          <tr><td>Выработка (итого)</td><td>${result!.worktotal.toLocaleString("ru-RU")} ₽</td></tr>
          ${details}
        </table><hr/>
        <table>
          <tr><td>Начислено</td><td>${result!.gross.toLocaleString("ru-RU")} ₽</td></tr>
          <tr class="ndfl"><td>НДФЛ (13%)</td><td>−${result!.ndfl.toLocaleString("ru-RU")} ₽</td></tr>
        </table><hr/>
        <div class="label">К выплате</div>
        <div class="total">${result!.net.toLocaleString("ru-RU")} ₽</div>
        <p style="font-size:12px;color:#aaa;margin-top:32px">Расчёт выполнен: ${new Date().toLocaleDateString("ru-RU")}</p>
      </body></html>`
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const reset = () => {
    setEmployeeName("")
    setPosition("")
    setSalary("")
    setCategories([
      { id: "1", name: "Кузовной ремонт", amount: 0, rate: 20 },
      { id: "2", name: "Слесарные работы", amount: 0, rate: 15 },
    ])
    setResult(null)
  }

  return (
    <section id="calculator" className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Онлайн-расчёт{" "}
            <span className="text-orange-500">зарплаты</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Введите данные сотрудника, настройте виды работ и процентные ставки — получите расчёт мгновенно.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 space-y-6">

            {/* Employee block */}
            <div className="rounded-2xl border border-orange-200 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="User" size={18} className="text-orange-500" />
                  Сотрудник
                </h3>
                {!isLoggedIn && (
                  <a href="/login" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                    <Icon name="LogIn" size={13} />
                    Войдите для выбора из справочника
                  </a>
                )}
              </div>

              {/* Выбор из справочника */}
              {isLoggedIn && savedEmployees.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-orange-300 bg-orange-500/10 hover:bg-orange-500/15 text-sm px-4 py-2.5 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
                      <Icon name="BookUser" size={15} />
                      Выбрать из справочника
                    </span>
                    <Icon name={showEmployeeDropdown ? "ChevronUp" : "ChevronDown"} size={15} className="text-orange-500" />
                  </button>

                  {showEmployeeDropdown && (
                    <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-orange-200 bg-card shadow-lg overflow-hidden">
                      {savedEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => selectEmployee(emp)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors text-left"
                        >
                          <div>
                            <div className="text-sm font-medium">{emp.name}</div>
                            {emp.position && <div className="text-xs text-muted-foreground">{emp.position}</div>}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 ml-4">{emp.salary.toLocaleString("ru-RU")} ₽</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">ФИО сотрудника</label>
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Должность</label>
                  <input
                    type="text"
                    placeholder="Автомеханик"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm text-muted-foreground">Оклад (₽)</label>
                  <input
                    type="number"
                    placeholder="30000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* Work categories block */}
            <div className="rounded-2xl border border-orange-200 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="Wrench" size={18} className="text-orange-500" />
                  Виды выработки
                </h3>
                {isLoggedIn && savedCategories.length > 0 && (
                  <button
                    onClick={loadCategoriesFromSaved}
                    className="text-xs text-orange-500 hover:underline flex items-center gap-1"
                  >
                    <Icon name="RefreshCw" size={13} />
                    Загрузить из справочника
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                  <span className="col-span-5">Вид работ</span>
                  <span className="col-span-3">Сумма (₽)</span>
                  <span className="col-span-3">Ставка (%)</span>
                  <span className="col-span-1"></span>
                </div>

                {categories.map((cat) => (
                  <div key={cat.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Название работ"
                      value={cat.name}
                      onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                      className="col-span-5 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={cat.amount || ""}
                      onChange={(e) => updateCategory(cat.id, "amount", parseFloat(e.target.value) || 0)}
                      className="col-span-3 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    />
                    <input
                      type="number"
                      placeholder="10"
                      value={cat.rate || ""}
                      onChange={(e) => updateCategory(cat.id, "rate", parseFloat(e.target.value) || 0)}
                      className="col-span-3 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    />
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="col-span-1 flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addCategory}
                className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 transition-colors mt-2"
              >
                <Icon name="Plus" size={16} />
                Добавить вид работ
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={calculate}
                className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="Calculator" size={18} />
                Рассчитать
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-input bg-background hover:bg-muted text-foreground font-medium py-3 px-5 transition-colors"
              >
                <Icon name="RotateCcw" size={18} />
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-2">
            <div
              className={cn(
                "rounded-2xl border bg-card p-6 h-full transition-all duration-500",
                result ? "border-orange-400 shadow-lg shadow-orange-500/10" : "border-orange-200 opacity-60",
              )}
            >
              <h3 className="font-semibold flex items-center gap-2 mb-6">
                <Icon name="FileText" size={18} className="text-orange-500" />
                Результат расчёта
              </h3>

              {result ? (
                <div className="space-y-5">
                  {(employeeName || position) && (
                    <div className="border-b border-orange-100 pb-3">
                      {employeeName && <div className="text-sm font-medium text-foreground">{employeeName}</div>}
                      {position && <div className="text-xs text-muted-foreground mt-0.5">{position}</div>}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Оклад</span>
                      <span className="font-medium">{(parseFloat(salary) || 0).toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Выработка (итого)</span>
                      <span className="font-medium">{result.worktotal.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-orange-100 pt-3">
                      <span className="text-muted-foreground">Начислено</span>
                      <span className="font-semibold">{result.gross.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">НДФЛ (13%)</span>
                      <span className="font-medium text-red-500">−{result.ndfl.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-orange-500/10 border border-orange-300 p-4 mt-4">
                    <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">К выплате</div>
                    <div className="text-3xl font-bold text-orange-500">
                      {result.net.toLocaleString("ru-RU")} ₽
                    </div>
                  </div>

                  {categories.some((c) => c.amount > 0) && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Детализация выработки</div>
                      {categories.filter((c) => c.amount > 0).map((c) => (
                        <div key={c.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{c.name || "Без названия"} ({c.rate}%)</span>
                          <span>+{Math.round((c.amount * c.rate) / 100).toLocaleString("ru-RU")} ₽</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-orange-100">
                    <button
                      onClick={printResult}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-medium py-2.5 transition-colors"
                    >
                      <Icon name="Printer" size={15} />
                      Печать
                    </button>
                    <button
                      onClick={printResult}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 transition-colors"
                    >
                      <Icon name="Download" size={15} />
                      Сохранить PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                  <Icon name="Calculator" size={40} className="text-orange-200" />
                  <p className="text-sm text-muted-foreground">
                    Заполните данные слева и нажмите «Рассчитать»
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
