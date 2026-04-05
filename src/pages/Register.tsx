import * as React from "react"
import { useNavigate, Link } from "react-router-dom"
import { apiRegister } from "@/lib/api"
import Icon from "@/components/ui/icon"

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await apiRegister(email, password, name)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    localStorage.setItem("token", res.token)
    localStorage.setItem("user", JSON.stringify(res.user))
    navigate("/cabinet")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-6">
            <div className="bg-orange-500 rounded-lg p-2">
              <Icon name="Calculator" size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold">ЗарплатаПро</span>
          </div>
          <h1 className="text-2xl font-semibold">Регистрация</h1>
          <p className="text-muted-foreground text-sm mt-1">Создайте аккаунт руководителя</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-orange-200 bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иванов Иван"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              minLength={6}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-medium py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="UserPlus" size={16} />}
            Создать аккаунт
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-orange-500 hover:underline">Войти</Link>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          <Link to="/" className="hover:text-orange-500 transition-colors">← На главную</Link>
        </p>
      </div>
    </div>
  )
}
