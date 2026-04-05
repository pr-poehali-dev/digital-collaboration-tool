import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import Icon from "@/components/ui/icon"
import { apiMe, apiLogout, apiGetEmployees, apiGetCategories, apiGetWorkDays } from "@/lib/api"

interface Employee { id: number; name: string; position: string; salary: number }
interface Category { id: number; name: string; rate: number }

interface EmployeeRow {
  empId: number
  name: string
  position: string
  salary: number
  workedDays: string
  categories: { id: string; name: string; rate: number; amount: string }[]
}

interface CalcResult {
  empId: number
  name: string
  position: string
  salaryByDays: number
  workTotal: number
  gross: number
  ndfl: number
  net: number
}

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]

export default function CabinetCalc() {
  const navigate = useNavigate()
  const [user, setUser] = React.useState<{ name: string } | null>(null)

  const now = new Date()
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth() + 1)
  const [normDays, setNormDays] = React.useState<number | null>(null)
  const [normLoading, setNormLoading] = React.useState(false)

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [savedCategories, setSavedCategories] = React.useState<Category[]>([])
  const [rows, setRows] = React.useState<EmployeeRow[]>([])
  const [results, setResults] = React.useState<CalcResult[]>([])
  const [loading, setLoading] = React.useState(true)

  // Загрузка данных
  React.useEffect(() => {
    const init = async () => {
      const res = await apiMe()
      if (res.error) { navigate("/login"); return }
      setUser(res.user)
      const [empRes, catRes] = await Promise.all([apiGetEmployees(), apiGetCategories()])
      const emps: Employee[] = empRes.employees || []
      const cats: Category[] = catRes.categories || []
      setEmployees(emps)
      setSavedCategories(cats)
      // Добавляем всех сотрудников в таблицу по умолчанию
      setRows(emps.map((e) => ({
        empId: e.id, name: e.name, position: e.position, salary: e.salary,
        workedDays: "",
        categories: cats.map((c) => ({ id: String(c.id), name: c.name, rate: c.rate, amount: "" })),
      })))
      setLoading(false)
    }
    init()
  }, [navigate])

  // Загрузка нормы дней из производственного календаря
  React.useEffect(() => {
    setNormDays(null)
    setNormLoading(true)
    apiGetWorkDays(year, month).then((res) => {
      if (res.work_days) setNormDays(res.work_days)
      setNormLoading(false)
    })
  }, [year, month])

  const periodLabel = `${MONTHS[month - 1]} ${year}`

  const addEmployee = () => {
    if (employees.length === 0) return
    const emp = employees[0]
    setRows([...rows, {
      empId: emp.id, name: emp.name, position: emp.position, salary: emp.salary,
      workedDays: "",
      categories: savedCategories.map((c) => ({ id: String(c.id), name: c.name, rate: c.rate, amount: "" })),
    }])
  }

  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  const updateRow = (idx: number, field: keyof EmployeeRow, value: string | number) => {
    setRows(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const selectEmployee = (idx: number, empId: number) => {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return
    setRows(rows.map((r, i) => i === idx ? { ...r, empId: emp.id, name: emp.name, position: emp.position, salary: emp.salary } : r))
  }

  const updateAmount = (rowIdx: number, catId: string, amount: string) => {
    setRows(rows.map((r, i) => i === rowIdx ? {
      ...r,
      categories: r.categories.map((c) => c.id === catId ? { ...c, amount } : c)
    } : r))
  }

  const calculate = () => {
    const norm = normDays || 22
    const res: CalcResult[] = rows.map((row) => {
      const worked = parseFloat(row.workedDays) || norm
      const salaryByDays = worked < norm ? Math.round((row.salary / norm) * worked) : row.salary
      const workTotal = Math.round(row.categories.reduce((sum, c) => sum + (parseFloat(c.amount) || 0) * c.rate / 100, 0))
      const gross = salaryByDays + workTotal
      const ndfl = Math.round(gross * 0.13)
      const net = gross - ndfl
      return { empId: row.empId, name: row.name, position: row.position, salaryByDays, workTotal, gross, ndfl, net }
    })
    setResults(res)
  }

  const printResults = () => {
    const rows_html = results.map((r) => `
      <tr>
        <td>${r.name}</td>
        <td>${r.position || "—"}</td>
        <td style="text-align:right">${r.salaryByDays.toLocaleString("ru-RU")} ₽</td>
        <td style="text-align:right">${r.workTotal.toLocaleString("ru-RU")} ₽</td>
        <td style="text-align:right">${r.gross.toLocaleString("ru-RU")} ₽</td>
        <td style="text-align:right;color:#ef4444">−${r.ndfl.toLocaleString("ru-RU")} ₽</td>
        <td style="text-align:right;font-weight:700;color:#f97316">${r.net.toLocaleString("ru-RU")} ₽</td>
      </tr>`).join("")
    const totals = results.reduce((acc, r) => ({ gross: acc.gross + r.gross, ndfl: acc.ndfl + r.ndfl, net: acc.net + r.net }), { gross: 0, ndfl: 0, net: 0 })
    const html = `<html><head><meta charset="utf-8"><title>Расчёт зарплаты — ${periodLabel}</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h2{color:#f97316}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#fff7ed;padding:8px 6px;text-align:left;border-bottom:2px solid #f97316}
      td{padding:6px;border-bottom:1px solid #e5e7eb}
      .total{background:#fff7ed;font-weight:700}</style></head>
      <body><h2>Расчёт зарплаты</h2><p><strong>Период:</strong> ${periodLabel} · Норма: ${normDays} р.д.</p>
      <table><thead><tr><th>Сотрудник</th><th>Должность</th><th>Оклад</th><th>Выработка</th><th>Начислено</th><th>НДФЛ</th><th>К выплате</th></tr></thead>
      <tbody>${rows_html}</tbody>
      <tfoot><tr class="total"><td colspan="4">Итого (${results.length} чел.)</td>
      <td style="text-align:right">${totals.gross.toLocaleString("ru-RU")} ₽</td>
      <td style="text-align:right;color:#ef4444">−${totals.ndfl.toLocaleString("ru-RU")} ₽</td>
      <td style="text-align:right;color:#f97316">${totals.net.toLocaleString("ru-RU")} ₽</td></tr></tfoot>
      </table><p style="font-size:11px;color:#aaa;margin-top:24px">Расчёт: ${new Date().toLocaleDateString("ru-RU")}</p>
      </body></html>`
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close(); win.print() }
  }

  const logout = async () => { await apiLogout(); navigate("/login") }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Icon name="Loader2" size={32} className="animate-spin text-orange-500" />
    </div>
  )

  const totals = results.reduce((acc, r) => ({ gross: acc.gross + r.gross, ndfl: acc.ndfl + r.ndfl, net: acc.net + r.net }), { gross: 0, ndfl: 0, net: 0 })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-orange-200 bg-background sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-orange-500 rounded-lg p-1.5">
              <Icon name="Calculator" size={18} className="text-white" />
            </div>
            <span className="font-bold">ЗарплатаПро</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/cabinet" className="text-sm text-muted-foreground hover:text-orange-500 transition-colors flex items-center gap-1.5">
              <Icon name="Settings" size={15} />
              Справочники
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-500 transition-colors">
              <Icon name="LogOut" size={16} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Расчёт зарплаты</h1>
        </div>

        {/* Period + norm */}
        <div className="rounded-2xl border border-orange-200 bg-card p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Icon name="Calendar" size={18} className="text-orange-500" />
            <span className="font-medium text-sm">Период:</span>
          </div>
          <div className="flex items-center gap-3">
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon name="CalendarDays" size={16} className="text-orange-500" />
            <span className="text-muted-foreground">Норма по производственному календарю:</span>
            {normLoading
              ? <Icon name="Loader2" size={14} className="animate-spin text-orange-500" />
              : <strong className="text-orange-500">{normDays ?? "—"} р.д.</strong>
            }
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-orange-200 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48">Сотрудник</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Оклад</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Отраб. дней</th>
                  {savedCategories.map((c) => (
                    <th key={c.id} className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      {c.name} ({c.rate}%)
                    </th>
                  ))}
                  <th className="w-8 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-orange-100 hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-colors">
                    <td className="px-4 py-2">
                      <select value={row.empId}
                        onChange={(e) => selectEmployee(idx, parseInt(e.target.value))}
                        className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      {row.position && <div className="text-xs text-muted-foreground mt-0.5 px-1">{row.position}</div>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" value={row.salary}
                        onChange={(e) => updateRow(idx, "salary", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" value={row.workedDays} placeholder={String(normDays ?? 22)}
                        onChange={(e) => updateRow(idx, "workedDays", e.target.value)}
                        className="w-20 text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </td>
                    {row.categories.map((cat) => (
                      <td key={cat.id} className="px-4 py-2 text-right">
                        <input type="number" value={cat.amount} placeholder="0"
                          onChange={(e) => updateAmount(idx, cat.id, e.target.value)}
                          className="w-28 text-right rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <button onClick={() => removeRow(idx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                        <Icon name="X" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-orange-100 flex items-center gap-3">
            <button onClick={addEmployee}
              className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 transition-colors">
              <Icon name="Plus" size={15} />
              Добавить сотрудника
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={calculate}
            className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-8 transition-colors">
            <Icon name="Calculator" size={18} />
            Рассчитать всех
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="rounded-2xl border border-orange-400 bg-card overflow-hidden shadow-lg shadow-orange-500/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <h2 className="font-semibold flex items-center gap-2">
                <Icon name="FileText" size={18} className="text-orange-500" />
                Результаты расчёта — {periodLabel}
              </h2>
              <button onClick={printResults}
                className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 transition-colors">
                <Icon name="Printer" size={15} />
                Печать / PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Сотрудник</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Должность</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Оклад</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Выработка</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Начислено</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">НДФЛ 13%</th>
                    <th className="text-right px-4 py-3 font-medium text-orange-500">К выплате</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-orange-100 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.position || "—"}</td>
                      <td className="px-4 py-3 text-right">{r.salaryByDays.toLocaleString("ru-RU")} ₽</td>
                      <td className="px-4 py-3 text-right">{r.workTotal.toLocaleString("ru-RU")} ₽</td>
                      <td className="px-4 py-3 text-right font-medium">{r.gross.toLocaleString("ru-RU")} ₽</td>
                      <td className="px-4 py-3 text-right text-red-500">−{r.ndfl.toLocaleString("ru-RU")} ₽</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-500">{r.net.toLocaleString("ru-RU")} ₽</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50 dark:bg-orange-950/30 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>Итого — {results.length} сотр.</td>
                    <td className="px-4 py-3 text-right">{totals.gross.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-3 text-right text-red-500">−{totals.ndfl.toLocaleString("ru-RU")} ₽</td>
                    <td className="px-4 py-3 text-right text-orange-500">{totals.net.toLocaleString("ru-RU")} ₽</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
