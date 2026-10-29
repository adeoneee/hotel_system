import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';

type RoomType = 'STANDARD' | 'LUX';
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
type UserRole = 'ADMIN' | 'GUEST';
type AuthMode = 'login' | 'register';
type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

interface Booking {
  id: number;
  roomId: number;
  roomNumber: string;
  guestId: number;
  guestFullName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

interface BookingAvailability {
  available: boolean;
  message: string;
}

interface CheckedBookingAvailability extends BookingAvailability {
  roomId: number;
  checkIn: string;
  checkOut: string;
}

interface Room {
  id: number;
  roomNumber: string;
  roomType: RoomType;
  capacity: number;
  pricePerNight: number;
  status: RoomStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoomForm {
  roomNumber: string;
  roomType: RoomType;
  capacity: string;
  pricePerNight: string;
  status: RoomStatus;
  description: string;
}

interface AppUser {
  id: number;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  accessToken: string;
  user?: AppUser;
}

interface ApiError {
  message?: string;
  detail?: string;
  title?: string;
}

const TOKEN_KEY = 'hotel_access_token';

const EMPTY_FORM: RoomForm = {
  roomNumber: '',
  roomType: 'STANDARD',
  capacity: '2',
  pricePerNight: '',
  status: 'AVAILABLE',
  description: '',
};

const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  STANDARD: 'Стандарт',
  LUX: 'Люкс',
};

const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  AVAILABLE: 'Свободен',
  OCCUPIED: 'Занят',
  CLEANING: 'Уборка',
  MAINTENANCE: 'Ремонт',
};
const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};
const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiError | null;
    const detail = errorBody?.message ?? errorBody?.detail ?? errorBody?.title;
    throw new Error(
      detail ? `${detail} (HTTP ${response.status})` : `Ошибка сервера: HTTP ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Произошла неизвестная ошибка';
}

async function fetchRooms(token: string): Promise<Room[]> {
  return apiRequest<Room[]>('/api/rooms', {}, token);
}
function getDateInputValue(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AppUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authChecking, setAuthChecking] = useState(() =>
    Boolean(sessionStorage.getItem(TOKEN_KEY))
  );

  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);

  const [bookingRoomId, setBookingRoomId] = useState('');
  const [bookingCheckIn, setBookingCheckIn] = useState(() => getDateInputValue(1));
  const [bookingCheckOut, setBookingCheckOut] = useState(() => getDateInputValue(2));

  const [bookingAvailability, setBookingAvailability] = useState<CheckedBookingAvailability | null>(
    null
  );

  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingActionId, setBookingActionId] = useState<number | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const currentRole = user?.role;
  const loadRooms = useCallback(async () => {
    if (!token) {
      setRooms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchRooms(token);
      setRooms(result);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let ignore = false;

    Promise.all([apiRequest<AppUser>('/api/auth/me', {}, token), fetchRooms(token)])
      .then(([currentUser, result]) => {
        if (!ignore) {
          setUser(currentUser);
          setRooms(result);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (ignore) return;

        const message = getErrorMessage(loadError);
        setError(message);

        if (message.includes('HTTP 401')) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          setRooms([]);
          setLoading(false);
          setNotice('Сессия завершилась. Войдите снова.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
          setAuthChecking(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !currentRole) {
      return;
    }

    let ignore = false;

    const endpoint = currentRole === 'ADMIN' ? '/api/bookings' : '/api/bookings/my';

    apiRequest<Booking[]>(endpoint, {}, token)
      .then((result) => {
        if (!ignore) {
          setBookings(result);
          setBookingsLoaded(true);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(getErrorMessage(loadError));
          setBookingsLoaded(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token, currentRole]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      available: rooms.filter((room) => room.status === 'AVAILABLE').length,
      occupied: rooms.filter((room) => room.status === 'OCCUPIED').length,
      maintenance: rooms.filter(
        (room) => room.status === 'CLEANING' || room.status === 'MAINTENANCE'
      ).length,
    }),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru-RU');
    if (!query) return rooms;

    return rooms.filter((room) =>
      [
        room.roomNumber,
        ROOM_TYPE_LABEL[room.roomType],
        ROOM_STATUS_LABEL[room.status],
        room.description ?? '',
      ].some((value) => value.toLocaleLowerCase('ru-RU').includes(query))
    );
  }, [rooms, search]);

  const selectedBookingRoom = rooms.find((room) => String(room.id) === bookingRoomId);

  const bookingNightCount = getNightCount(bookingCheckIn, bookingCheckOut);

  const estimatedBookingTotal =
    selectedBookingRoom && bookingNightCount > 0
      ? selectedBookingRoom.pricePerNight * bookingNightCount
      : null;

  function updateField<K extends keyof RoomForm>(field: K, value: RoomForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(room: Room) {
    setEditingId(room.id);
    setForm({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      status: room.status,
      description: room.description ?? '',
    });
    setError(null);
    setNotice(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setNotice(null);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const result = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...(authMode === 'register' ? { fullName: authFullName.trim() } : {}),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      if (!result.accessToken) {
        throw new Error('Сервер не вернул accessToken. Проверьте формат ответа API.');
      }

      sessionStorage.setItem(TOKEN_KEY, result.accessToken);
      setAuthChecking(true);
      setToken(result.accessToken);
      setUser(result.user ?? null);
      setAuthPassword('');
      if (authMode === 'register') setAuthFullName('');
      setNotice(
        authMode === 'login' ? 'Вы вошли в систему.' : 'Аккаунт создан. Вы вошли в систему.'
      );
    } catch (authError: unknown) {
      setError(getErrorMessage(authError));
    } finally {
      setAuthSubmitting(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setRooms([]);
    setLoading(false);
    setAuthChecking(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBookings([]);
    setBookingsLoaded(false);
    setBookingRoomId('');
    setBookingCheckIn(getDateInputValue(1));
    setBookingCheckOut(getDateInputValue(2));
    setBookingAvailability(null);
    setBookingActionId(null);
    setSearch('');
    setError(null);
    setNotice('Вы вышли из системы.');
    setAuthMode('login');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !isAdmin) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      roomNumber: form.roomNumber.trim(),
      roomType: form.roomType,
      capacity: Number(form.capacity),
      pricePerNight: Number(form.pricePerNight),
      status: form.status,
      description: form.description.trim() || null,
    };

    try {
      if (editingId === null) {
        await apiRequest<Room>(
          '/api/rooms',
          { method: 'POST', body: JSON.stringify(payload) },
          token
        );
        setNotice('Номер успешно создан и сохранён в базе данных.');
      } else {
        await apiRequest<Room>(
          `/api/rooms/${editingId}`,
          { method: 'PUT', body: JSON.stringify(payload) },
          token
        );
        setNotice('Изменения номера успешно сохранены.');
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadRooms();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(room: Room) {
    if (!token || !isAdmin) return;

    const confirmed = window.confirm(
      `Удалить номер ${room.roomNumber}? Это действие нельзя отменить.`
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);

    try {
      await apiRequest<void>(`/api/rooms/${room.id}`, { method: 'DELETE' }, token);
      if (editingId === room.id) cancelEditing();
      setNotice(`Номер ${room.roomNumber} удалён.`);
      await loadRooms();
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError));
    }
  }
  async function handleCheckAvailability() {
    if (!token) {
      return;
    }

    if (!bookingRoomId) {
      setError('Выберите номер для бронирования.');
      return;
    }

    if (
      !bookingCheckIn ||
      !bookingCheckOut ||
      bookingCheckIn < getDateInputValue(0) ||
      bookingCheckOut <= bookingCheckIn
    ) {
      setError('Проверьте даты заезда и выезда.');
      return;
    }

    setError(null);
    setNotice(null);
    setBookingAvailability(null);

    try {
      const result = await apiRequest<BookingAvailability>(
        `/api/bookings/availability?roomId=${bookingRoomId}&checkIn=${bookingCheckIn}&checkOut=${bookingCheckOut}`,
        {},
        token
      );

      setBookingAvailability({
        ...result,
        roomId: Number(bookingRoomId),
        checkIn: bookingCheckIn,
        checkOut: bookingCheckOut,
      });

      if (result.available) {
        setNotice(result.message);
      } else {
        setError(result.message);
      }
    } catch (checkError: unknown) {
      setError(getErrorMessage(checkError));
    }
  }

  async function handleCreateBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (!bookingRoomId) {
      setError('Выберите номер для бронирования.');
      return;
    }

    if (
      !bookingCheckIn ||
      !bookingCheckOut ||
      bookingCheckIn < getDateInputValue(0) ||
      bookingCheckOut <= bookingCheckIn
    ) {
      setError('Дата выезда должна быть позже даты заезда.');
      return;
    }

    setBookingSaving(true);
    setError(null);
    setNotice(null);

    try {
      // Повторно проверяем доступность непосредственно перед созданием.
      const availability = await apiRequest<BookingAvailability>(
        `/api/bookings/availability?roomId=${bookingRoomId}&checkIn=${bookingCheckIn}&checkOut=${bookingCheckOut}`,
        {},
        token
      );

      setBookingAvailability({
        ...availability,
        roomId: Number(bookingRoomId),
        checkIn: bookingCheckIn,
        checkOut: bookingCheckOut,
      });

      if (!availability.available) {
        setError(availability.message);
        return;
      }

      const created = await apiRequest<Booking>(
        '/api/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            roomId: Number(bookingRoomId),
            checkIn: bookingCheckIn,
            checkOut: bookingCheckOut,
          }),
        },
        token
      );

      setBookingAvailability(null);

      setNotice(
        `Бронирование №${created.id} создано на ${created.nights} ночи. Стоимость: ${moneyFormatter.format(created.totalPrice)}.`
      );

      await refreshBookings();
    } catch (bookingError: unknown) {
      setError(getErrorMessage(bookingError));
    } finally {
      setBookingSaving(false);
    }
  }

  async function refreshBookings() {
    if (!token || !currentRole) {
      return;
    }

    setBookingsLoaded(false);

    try {
      const endpoint = currentRole === 'ADMIN' ? '/api/bookings' : '/api/bookings/my';

      const result = await apiRequest<Booking[]>(endpoint, {}, token);
      setBookings(result);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setBookingsLoaded(true);
    }
  }

  async function handleCancelBooking(booking: Booking) {
    if (!token || booking.status !== 'CONFIRMED') {
      return;
    }

    const confirmed = window.confirm(
      `Отменить бронирование №${booking.id} на номер ${booking.roomNumber}?`
    );

    if (!confirmed) {
      return;
    }

    setBookingActionId(booking.id);
    setError(null);
    setNotice(null);

    try {
      await apiRequest<Booking>(`/api/bookings/${booking.id}/cancel`, { method: 'POST' }, token);

      setNotice(`Бронирование №${booking.id} отменено.`);
      await refreshBookings();
    } catch (cancelError: unknown) {
      setError(getErrorMessage(cancelError));
    } finally {
      setBookingActionId(null);
    }
  }

  async function handleBookingStatusChange(bookingId: number, status: BookingStatus) {
    if (!token || !isAdmin) {
      return;
    }

    setBookingActionId(bookingId);
    setError(null);
    setNotice(null);

    try {
      await apiRequest<Booking>(
        `/api/bookings/${bookingId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        token
      );

      setNotice(`Статус бронирования №${bookingId} обновлён.`);
      await refreshBookings();
    } catch (statusError: unknown) {
      setError(getErrorMessage(statusError));
    } finally {
      setBookingActionId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Hotel System">
          <span className="brand-mark">H</span>
          <span>
            <strong>HOTEL SYSTEM</strong>
            <small>УПРАВЛЕНИЕ ГОСТИНИЦЕЙ</small>
          </span>
        </a>

        {token && user ? (
          <div className="account-bar">
            <span className="account-details">
              <strong>{user.email}</strong>
              <small>{user.role === 'ADMIN' ? 'Администратор' : 'Гость'}</small>
            </span>
            <button
              className="button button-secondary logout-button"
              type="button"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="environment">
            <span className="environment-dot" />
            Авторизация
          </div>
        )}
      </header>

      {error && (
        <div className="message message-error global-message" role="alert">
          <strong>Ошибка</strong>
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="message message-success global-message" role="status">
          <strong>Готово</strong>
          <span>{notice}</span>
        </div>
      )}

      {!token ? (
        <main className="page auth-page">
          <section className="page-heading">
            <div>
              <p className="eyebrow">HOTEL SYSTEM / ЛИЧНЫЙ КАБИНЕТ</p>
              <h1>{authMode === 'login' ? 'Вход в систему' : 'Регистрация гостя'}</h1>
              <p className="page-subtitle">
                {authMode === 'login'
                  ? 'Войдите, чтобы открыть номерной фонд гостиницы.'
                  : 'Создайте гостевой аккаунт для просмотра номерного фонда.'}
              </p>
            </div>
          </section>

          <section className="panel auth-panel">
            <div className="auth-tabs" role="group" aria-label="Тип авторизации">
              <button
                type="button"
                className={`auth-tab ${authMode === 'login' ? 'auth-tab-active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
              >
                Вход
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === 'register' ? 'auth-tab-active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
              >
                Регистрация
              </button>
            </div>

            <form className="room-form auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-field">
                  <label htmlFor="authFullName">ФИО</label>
                  <input
                    id="authFullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={authFullName}
                    onChange={(event) => setAuthFullName(event.target.value)}
                    placeholder="Иванов Иван Иванович"
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </div>
              )}
              <div className="form-field">
                <label htmlFor="authEmail">Электронная почта</label>
                <input
                  id="authEmail"
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="name@example.com"
                  maxLength={254}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="authPassword">Пароль</label>
                <input
                  id="authPassword"
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                />
                {authMode === 'register' && (
                  <small className="field-help">Регистрация создаёт аккаунт с ролью «Гость».</small>
                )}
              </div>
              <button
                className="button button-primary submit-button"
                type="submit"
                disabled={authSubmitting}
              >
                {authSubmitting ? 'Подождите…' : authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </button>
            </form>
            <p className="auth-footnote">
              Администратор входит по учётным данным, заданным при первоначальной настройке сервера.
            </p>
          </section>
          <footer className="page-footer">
            <span>HOTEL SYSTEM · ЛАБОРАТОРНАЯ РАБОТА №6</span>
            <span>JWT · Spring Security</span>
          </footer>
        </main>
      ) : authChecking ? (
        <main className="page loading-page">
          <section className="panel auth-panel">
            <p className="eyebrow">ПРОВЕРКА СЕССИИ</p>
            <h2>Проверяем авторизацию…</h2>
          </section>
        </main>
      ) : (
        <main className="page">
          <section className="page-heading">
            <div>
              <p className="eyebrow">ОПЕРАЦИОННАЯ ПАНЕЛЬ / НОМЕРНОЙ ФОНД</p>
              <h1>Номера гостиницы</h1>
              <p className="page-subtitle">
                {isAdmin
                  ? 'Просматривайте номерной фонд и управляйте данными номеров.'
                  : 'Просматривайте доступные сведения о номерах гостиницы.'}
              </p>
            </div>
            <button
              className="button button-secondary refresh-button"
              type="button"
              onClick={() => void loadRooms()}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              Обновить
            </button>
          </section>

          <section className="stats-grid" aria-label="Статистика номерного фонда">
            <article className="stat-card">
              <span className="stat-label">Всего номеров</span>
              <strong className="stat-value">{stats.total}</strong>
              <span className="stat-note">Записей в базе данных</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Свободны</span>
              <strong className="stat-value">{stats.available}</strong>
              <span className="stat-note">Доступны по статусу</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Заняты</span>
              <strong className="stat-value">{stats.occupied}</strong>
              <span className="stat-note">Статус проживания</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Обслуживание</span>
              <strong className="stat-value">{stats.maintenance}</strong>
              <span className="stat-note">Уборка или ремонт</span>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel rooms-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">НОМЕРНОЙ ФОНД</p>
                  <h2>Все номера</h2>
                </div>
                <span className="count-badge">{rooms.length}</span>
              </div>

              <div className="table-toolbar">
                <label className="search-field">
                  <span aria-hidden="true" className="search-icon">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск по номеру, типу или статусу"
                    aria-label="Поиск номеров"
                  />
                </label>
                <span className="result-count">Показано: {filteredRooms.length}</span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>Тип</th>
                      <th>Мест</th>
                      <th>Цена / ночь</th>
                      <th>Статус</th>
                      {isAdmin && (
                        <th>
                          <span className="visually-hidden">Действия</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="table-message">
                          Загружаем данные из PostgreSQL…
                        </td>
                      </tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="table-message">
                          {rooms.length === 0
                            ? 'Номеров пока нет.'
                            : 'По вашему запросу ничего не найдено.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((room) => (
                        <tr key={room.id}>
                          <td>
                            <div className="room-number">
                              <span className="room-icon" aria-hidden="true">
                                ▦
                              </span>
                              <span>
                                <strong>{room.roomNumber}</strong>
                                <small>ID: {room.id}</small>
                              </span>
                            </div>
                          </td>
                          <td>{ROOM_TYPE_LABEL[room.roomType]}</td>
                          <td>{room.capacity}</td>
                          <td className="price-cell">
                            {moneyFormatter.format(room.pricePerNight)}
                          </td>
                          <td>
                            <span className={`status-badge status-${room.status.toLowerCase()}`}>
                              <span className="status-dot" />
                              {ROOM_STATUS_LABEL[room.status]}
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="row-actions">
                                <button
                                  className="icon-button"
                                  type="button"
                                  title={`Редактировать номер ${room.roomNumber}`}
                                  aria-label={`Редактировать номер ${room.roomNumber}`}
                                  onClick={() => startEditing(room)}
                                >
                                  ✎
                                </button>
                                <button
                                  className="icon-button delete-button"
                                  type="button"
                                  title={`Удалить номер ${room.roomNumber}`}
                                  aria-label={`Удалить номер ${room.roomNumber}`}
                                  onClick={() => void handleDelete(room)}
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            {isAdmin ? (
              <aside className="panel form-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      {editingId === null ? 'НОВАЯ ЗАПИСЬ' : `РЕДАКТИРОВАНИЕ · ID ${editingId}`}
                    </p>
                    <h2>{editingId === null ? 'Добавить номер' : 'Изменить номер'}</h2>
                  </div>
                  <span className="form-heading-icon" aria-hidden="true">
                    {editingId === null ? '+' : '✎'}
                  </span>
                </div>

                <form className="room-form" onSubmit={handleSubmit}>
                  <div className="form-field">
                    <label htmlFor="roomNumber">Номер комнаты</label>
                    <input
                      id="roomNumber"
                      name="roomNumber"
                      value={form.roomNumber}
                      onChange={(event) => updateField('roomNumber', event.target.value)}
                      placeholder="Например, 102"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="roomType">Тип номера</label>
                      <select
                        id="roomType"
                        value={form.roomType}
                        onChange={(event) =>
                          updateField('roomType', event.target.value as RoomType)
                        }
                      >
                        <option value="STANDARD">Стандарт</option>
                        <option value="LUX">Люкс</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="capacity">Вместимость</label>
                      <input
                        id="capacity"
                        type="number"
                        min="1"
                        step="1"
                        value={form.capacity}
                        onChange={(event) => updateField('capacity', event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="pricePerNight">Цена за ночь, ₽</label>
                      <input
                        id="pricePerNight"
                        type="number"
                        min="0.01"
                        max="99999999.99"
                        step="0.01"
                        value={form.pricePerNight}
                        onChange={(event) => updateField('pricePerNight', event.target.value)}
                        placeholder="3500.00"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="status">Статус</label>
                      <select
                        id="status"
                        value={form.status}
                        onChange={(event) =>
                          updateField('status', event.target.value as RoomStatus)
                        }
                      >
                        <option value="AVAILABLE">Свободен</option>
                        <option value="OCCUPIED">Занят</option>
                        <option value="CLEANING">Уборка</option>
                        <option value="MAINTENANCE">Ремонт</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-field">
                    <label htmlFor="description">Описание</label>
                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      placeholder="Дополнительная информация о номере"
                      maxLength={2000}
                      rows={4}
                    />
                  </div>
                  <button
                    className="button button-primary submit-button"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? 'Сохранение…'
                      : editingId === null
                        ? 'Создать номер'
                        : 'Сохранить изменения'}
                  </button>
                  {editingId !== null && (
                    <button
                      className="button button-secondary cancel-button"
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Отменить редактирование
                    </button>
                  )}
                </form>
              </aside>
            ) : (
              <aside className="panel form-panel guest-info-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
                    <h2>Режим просмотра</h2>
                  </div>
                  <span className="form-heading-icon" aria-hidden="true">
                    ✓
                  </span>
                </div>
                <div className="form-note">
                  <span className="note-icon" aria-hidden="true">
                    ↗
                  </span>
                  <h4>Вы вошли как гость.</h4>
                </div>
              </aside>
            )}
          </section>
          <section className="booking-section">
            {!isAdmin && (
              <article className="panel booking-create-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">НОВАЯ БРОНЬ</p>
                    <h2>Забронировать номер</h2>
                  </div>
                  <span className="form-heading-icon" aria-hidden="true">
                    +
                  </span>
                </div>

                <form className="room-form booking-form" onSubmit={handleCreateBooking}>
                  <div className="form-field">
                    <label htmlFor="bookingRoom">Номер гостиницы</label>
                    <select
                      id="bookingRoom"
                      value={bookingRoomId}
                      onChange={(event) => {
                        setBookingRoomId(event.target.value);
                        setBookingAvailability(null);
                        setError(null);
                        setNotice(null);
                      }}
                      required
                    >
                      <option value="">Выберите номер</option>
                      {rooms
                        .filter((room) => room.status === 'AVAILABLE')
                        .map((room) => (
                          <option key={room.id} value={String(room.id)}>
                            № {room.roomNumber} — {ROOM_TYPE_LABEL[room.roomType]},{' '}
                            {moneyFormatter.format(room.pricePerNight)} / ночь
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="booking-dates-grid">
                    <div className="form-field">
                      <label htmlFor="bookingCheckIn">Дата заезда</label>
                      <input
                        id="bookingCheckIn"
                        type="date"
                        min={getDateInputValue(0)}
                        value={bookingCheckIn}
                        onChange={(event) => {
                          setBookingCheckIn(event.target.value);
                          setBookingAvailability(null);
                          setError(null);
                          setNotice(null);
                        }}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="bookingCheckOut">Дата выезда</label>
                      <input
                        id="bookingCheckOut"
                        type="date"
                        min={bookingCheckIn || getDateInputValue(0)}
                        value={bookingCheckOut}
                        onChange={(event) => {
                          setBookingCheckOut(event.target.value);
                          setBookingAvailability(null);
                          setError(null);
                          setNotice(null);
                        }}
                        required
                      />
                    </div>
                  </div>

                  {selectedBookingRoom && bookingNightCount > 0 && (
                    <div className="booking-price-preview">
                      <span>Количество ночей</span>
                      <strong>{bookingNightCount}</strong>

                      <span>Цена за ночь</span>
                      <strong>{moneyFormatter.format(selectedBookingRoom.pricePerNight)}</strong>

                      <span>Предварительная стоимость</span>
                      <strong>
                        {estimatedBookingTotal === null
                          ? '—'
                          : moneyFormatter.format(estimatedBookingTotal)}
                      </strong>
                    </div>
                  )}

                  <button
                    className="button button-secondary submit-button"
                    type="button"
                    onClick={() => void handleCheckAvailability()}
                  >
                    Проверить доступность
                  </button>

                  {bookingAvailability && (
                    <div
                      className={`availability-result ${
                        bookingAvailability.available
                          ? 'availability-success'
                          : 'availability-error'
                      }`}
                      role="status"
                    >
                      {bookingAvailability.message}
                    </div>
                  )}

                  <button
                    className="button button-primary submit-button"
                    type="submit"
                    disabled={bookingSaving || !bookingRoomId}
                  >
                    {bookingSaving ? 'Создание бронирования…' : 'Забронировать'}
                  </button>
                </form>

                <div className="form-note">
                  <span className="note-icon" aria-hidden="true">
                    ↗
                  </span>
                  <p>
                    Даты проверяются сервером при создании брони. Если выбранный период уже занят,
                    система не позволит оформить пересекающееся бронирование.
                  </p>
                </div>
              </article>
            )}

            <article className="panel bookings-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    {isAdmin ? 'УПРАВЛЕНИЕ БРОНИРОВАНИЯМИ' : 'ЛИЧНЫЙ КАБИНЕТ'}
                  </p>
                  <h2>{isAdmin ? 'Все бронирования' : 'Мои бронирования'}</h2>
                </div>

                <span className="count-badge">{bookings.length}</span>
              </div>

              <div className="booking-list-toolbar">
                <span className="result-count">
                  {isAdmin ? 'Брони всех гостей' : 'Ваши бронирования из базы данных'}
                </span>

                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void refreshBookings()}
                  disabled={!bookingsLoaded}
                >
                  Обновить
                </button>
              </div>

              <div className="table-wrapper booking-table-wrapper">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      {isAdmin && <th>Гость</th>}
                      <th>Номер</th>
                      <th>Заезд</th>
                      <th>Выезд</th>
                      <th>Ночей</th>
                      <th>Стоимость</th>
                      <th>Статус</th>
                      <th>{isAdmin ? 'Управление' : 'Действие'}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!bookingsLoaded ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="table-message">
                          Загружаем бронирования…
                        </td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="table-message">
                          {isAdmin
                            ? 'Бронирований пока нет.'
                            : 'У вас пока нет бронирований. Выберите номер и даты выше.'}
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>#{booking.id}</td>

                          {isAdmin && (
                            <td>
                              <div className="booking-guest">
                                <strong>{booking.guestFullName}</strong>
                                <small>{booking.guestEmail}</small>
                              </div>
                            </td>
                          )}

                          <td>
                            <strong>{booking.roomNumber}</strong>
                          </td>

                          <td>{booking.checkIn}</td>
                          <td>{booking.checkOut}</td>
                          <td>{booking.nights}</td>

                          <td className="price-cell">
                            {moneyFormatter.format(booking.totalPrice)}
                          </td>

                          <td>
                            <span
                              className={`booking-status booking-status-${booking.status.toLowerCase()}`}
                            >
                              {BOOKING_STATUS_LABEL[booking.status]}
                            </span>
                          </td>

                          <td>
                            {isAdmin ? (
                              <select
                                className="booking-status-select"
                                aria-label={`Статус бронирования ${booking.id}`}
                                value={booking.status}
                                disabled={bookingActionId === booking.id}
                                onChange={(event) =>
                                  void handleBookingStatusChange(
                                    booking.id,
                                    event.target.value as BookingStatus
                                  )
                                }
                              >
                                <option value="CONFIRMED">Подтверждено</option>
                                <option value="CANCELLED">Отменено</option>
                                <option value="COMPLETED">Завершено</option>
                              </select>
                            ) : booking.status === 'CONFIRMED' ? (
                              <button
                                className="button button-secondary booking-cancel-button"
                                type="button"
                                disabled={bookingActionId === booking.id}
                                onClick={() => void handleCancelBooking(booking)}
                              >
                                {bookingActionId === booking.id ? 'Отмена…' : 'Отменить'}
                              </button>
                            ) : (
                              <span className="booking-no-action">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel-footer"></div>
            </article>
          </section>
          <footer className="page-footer">
            <span>HOTEL SYSTEM</span>
          </footer>
        </main>
      )}
    </div>
  );
}

export default App;
