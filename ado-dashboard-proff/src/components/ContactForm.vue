<template>
  <section class="contact-wrap" aria-label="Kontaktformular">
    <div class="container">
      <div class="card contact-card">
        <!-- Kopfbereich mit Status-Banner -->
        <div class="row header-row">
          <div class="col">
            <h3 class="title">Kontakt aufnehmen</h3>
            <p class="small">
              Juanmexican
            </p>
          </div>
          <div class="col status-col" aria-live="polite">
            <transition name="fade">
              <div v-if="banner.type" class="banner" :class="banner.type">
                <svg v-if="banner.type === 'success'" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="banner.type === 'danger'" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 8v5M12 17h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else-if="banner.type === 'warn'" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 9v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>{{ banner.message }}</span>
              </div>
            </transition>
          </div>
        </div>

        <form
            class="form"
            :class="{ sending: isSubmitting }"
            @submit.prevent="onSubmit"
            novalidate
        >
          <!-- Honeypot (Spam-Schutz) -->
          <input type="text" autocomplete="off" tabindex="-1" class="honeypot" v-model="honeypot" aria-hidden="true" />

          <!-- Name + Email -->
          <div class="row">
            <div class="col field">
              <label class="label" for="name">Name</label>
              <div class="control" :class="{ invalid: hasErr('name'), valid: touched.name && !hasErr('name') }">
                <input
                    id="name"
                    class="input"
                    type="text"
                    v-model.trim="form.name"
                    :disabled="isSubmitting"
                    @blur="touch('name')"
                    @input="debouncedValidate('name')"
                    aria-invalid="hasErr('name') ? 'true' : 'false'"
                    aria-describedby="err-name"
                    placeholder="Dein Name"
                />
                <i class="hint" v-if="touched.name && !hasErr('name')">Sieht gut aus.</i>
              </div>
              <transition name="slide-fade">
                <p v-if="hasErr('name')" id="err-name" class="msg danger">{{ errors.name }}</p>
              </transition>
            </div>

            <div class="col field">
              <label class="label" for="email">E-Mail</label>
              <div class="control" :class="{ invalid: hasErr('email'), valid: touched.email && !hasErr('email') }">
                <input
                    id="email"
                    class="input"
                    type="email"
                    inputmode="email"
                    autocapitalize="off"
                    autocomplete="email"
                    v-model.trim="form.email"
                    :disabled="isSubmitting"
                    @blur="touch('email')"
                    @input="debouncedValidate('email')"
                    aria-invalid="hasErr('email') ? 'true' : 'false'"
                    aria-describedby="err-email tip-email"
                    placeholder="name@beispiel.de"
                />
                <i class="hint" v-if="emailTip && !hasErr('email')" id="tip-email">{{ emailTip }}</i>
              </div>
              <transition name="slide-fade">
                <p v-if="hasErr('email')" id="err-email" class="msg danger">{{ errors.email }}</p>
              </transition>
            </div>
          </div>

          <!-- Betreff -->
          <div class="row">
            <div class="col field">
              <label class="label" for="subject">Betreff</label>
              <div class="control" :class="{ invalid: hasErr('subject'), valid: touched.subject && !hasErr('subject') }">
                <input
                    id="subject"
                    class="input"
                    type="text"
                    v-model.trim="form.subject"
                    :disabled="isSubmitting"
                    @blur="touch('subject')"
                    @input="debouncedValidate('subject')"
                    aria-invalid="hasErr('subject') ? 'true' : 'false'"
                    aria-describedby="err-subject"
                    placeholder="Worum geht es?"
                />
                <i class="hint" v-if="touched.subject && !hasErr('subject')">Geil</i>
              </div>
              <transition name="slide-fade">
                <p v-if="hasErr('subject')" id="err-subject" class="msg danger">{{ errors.subject }}</p>
              </transition>
            </div>
          </div>

          <!-- Nachricht -->
          <div class="row">
            <div class="col field">
              <label class="label" for="message">Nachricht</label>
              <div class="control textarea-ctl" :class="{ invalid: hasErr('message'), valid: touched.message && !hasErr('message') }">
                <textarea
                    id="message"
                    class="input textarea"
                    rows="5"
                    v-model.trim="form.message"
                    :disabled="isSubmitting"
                    @blur="touch('message')"
                    @input="onMessageInput"
                    aria-invalid="hasErr('message') ? 'true' : 'false'"
                    aria-describedby="err-message counter"
                    placeholder="Schreib uns ein paar Details…"
                />
                <div class="row minor">
                  <span id="counter" class="small">{{ form.message.length }} / {{ MESSAGE_MAX }} Zeichen</span>
                  <i class="hint" v-if="touched.message && !hasErr('message')">Danke für die Details! Wirklich!</i>
                </div>
              </div>
              <transition name="slide-fade">
                <p v-if="hasErr('message')" id="err-message" class="msg danger">{{ errors.message }}</p>
              </transition>
            </div>
          </div>

          <!-- Zustimmung -->
          <div class="row consent-row">
            <div class="col">
              <label class="checkbox">
                <input
                    type="checkbox"
                    v-model="form.consent"
                    :disabled="isSubmitting"
                    @change="touch('consent')"
                    aria-invalid="hasErr('consent') ? 'true' : 'false'"
                    aria-describedby="err-consent"
                />
                <span>
                  Mit dem Absenden bestätige ich die
                  <a href="/impressum-&-datenschutz/datenschutzerklaerung" target="_blank" rel="noopener">Datenschutzerklärung</a>
                  und die
                  <a href="/impressum-&-datenschutz/impressum" target="_blank" rel="noopener">AGB</a>.
                </span>
              </label>
              <transition name="slide-fade">
                <p v-if="hasErr('consent')" id="err-consent" class="msg danger">{{ errors.consent }}</p>
              </transition>
            </div>
          </div>

          <!-- Aktionen -->
          <div class="row actions">
            <div class="col">
              <button
                  class="btn"
                  type="submit"
                  :disabled="isSubmitting || !form.consent || coolDownActive"
                  :title="coolDownActive ? 'Bitte kurz warten…' : 'Nachricht senden'"
              >
                <svg v-if="isSubmitting" class="spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="#111827" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="60" stroke-dashoffset="20" />
                </svg>
                <span>{{ isSubmitting ? 'Wird gesendet…' : 'Nachricht senden' }}</span>
              </button>
              <button class="btn ghost" type="button" @click="reset" :disabled="isSubmitting">Zurücksetzen</button>
              <transition name="fade">
                <span v-if="coolDownActive" class="small cool">Danke für die Nachicht!.</span>
              </transition>
            </div>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from 'vue'

type StatusType = 'success' | 'danger' | 'warn' | ''

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdkwadva'
const MESSAGE_MAX = 2000
const SUBMIT_COOLDOWN_MS = 4000

const isSubmitting = ref(false)
const coolDownActive = ref(false)
const lastSubmitAt = ref<number | null>(null)

const touched = reactive<Record<string, boolean>>({
  name: false,
  email: false,
  subject: false,
  message: false,
  consent: false
})

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: false
})

const errors = reactive<Record<string, string>>({
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: ''
})

const banner = reactive<{ type: StatusType; message: string }>({
  type: '',
  message: ''
})

const honeypot = ref('')
const emailTip = ref('')

function touch(field: keyof typeof touched) {
  touched[field] = true
  validateField(field)
}

function hasErr(field: keyof typeof errors) {
  return !!errors[field]
}

function validateEmail(email: string) {
  // pragmatische E-Mail-Validierung
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
  return re.test(email)
}

function suggestEmailTip(email: string) {
  if (!email) { emailTip.value = ''; return }
  if (!email.includes('@')) { emailTip.value = 'Tipp: E-Mail-Adressen enthalten ein @-Zeichen.'; return }
  const domain = email.split('@')[1] || ''
  const common = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'gmx.de', 'web.de', 'icloud.com']
  if (domain && !domain.includes('.')) {
    emailTip.value = 'Tipp: Die Domäne sollte einen Punkt enthalten (z. B. gmx.de).'
  } else if (domain && common.includes(domain.toLowerCase())) {
    emailTip.value = `Sieht korrekt aus (${domain}).`
  } else {
    emailTip.value = ''
  }
}

function validateField(field: keyof typeof errors) {
  switch (field) {
    case 'name':
      errors.name = form.name.trim().length >= 2 ? '' : 'Bitte gib einen gültigen Namen an (mind. 2 Zeichen).'
      break
    case 'email':
      errors.email = validateEmail(form.email) ? '' : 'Bitte gib eine gültige E-Mail-Adresse ein.'
      suggestEmailTip(form.email)
      break
    case 'subject':
      errors.subject = form.subject.trim().length >= 2 ? '' : 'Bitte ergänze einen kurzen Betreff (mind. 2 Zeichen).'
      break
    case 'message': {
      const len = form.message.trim().length
      if (len < 10) errors.message = 'Deine Nachricht sollte mindestens 10 Zeichen enthalten.'
      else if (len > MESSAGE_MAX) errors.message = `Maximal ${MESSAGE_MAX} Zeichen erlaubt.`
      else errors.message = ''
      break
    }
    case 'consent':
      errors.consent = form.consent ? '' : 'Bitte bestätige Datenschutz und AGB.'
      break
  }
}

const debouncedTimers: Record<string, number | undefined> = {}
function debouncedValidate(field: keyof typeof errors) {
  window.clearTimeout(debouncedTimers[field])
  debouncedTimers[field] = window.setTimeout(() => validateField(field), 200)
}

function validateAll() {
  ;(['name', 'email', 'subject', 'message', 'consent'] as const).forEach((f) => {
    touched[f] = true
    validateField(f)
  })
  return !Object.values(errors).some((e) => e)
}

function reset() {
  form.name = ''
  form.email = ''
  form.subject = ''
  form.message = ''
  form.consent = false
  honeypot.value = ''
  Object.keys(errors).forEach((k) => (errors[k] = ''))
  Object.keys(touched).forEach((k) => (touched[k] = false))
  banner.type = ''
  banner.message = ''
  emailTip.value = ''
}

function startCooldown() {
  coolDownActive.value = true
  lastSubmitAt.value = Date.now()
  window.setTimeout(() => (coolDownActive.value = false), SUBMIT_COOLDOWN_MS)
}

function onMessageInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  // sanftes Auto-Resize
  target.style.height = 'auto'
  target.style.height = Math.min(target.scrollHeight, 400) + 'px'
  debouncedValidate('message')
}

async function onSubmit() {
  if (coolDownActive.value) return
  startCooldown()

  if (honeypot.value) {
    banner.type = 'warn'
    banner.message = 'Dein Formular konnte nicht gesendet werden.'
    return
  }

  if (!validateAll()) {
    banner.type = 'danger'
    banner.message = 'Bitte korrigiere die markierten Felder.'
    return
  }

  isSubmitting.value = true
  banner.type = ''
  banner.message = ''

  try {
    const payload = {
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message
    }

    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      banner.type = 'success'
      banner.message = 'Danke! Deine Nachricht wurde erfolgreich gesendet.'
      reset()
    } else {
      const data = await res.json().catch(() => ({}))
      const msg =
          (data && (data.error || data.message)) ||
          'Es ist ein Fehler beim Senden aufgetreten. Bitte versuche es später erneut.'
      banner.type = 'danger'
      banner.message = msg
    }
  } catch {
    banner.type = 'danger'
    banner.message = 'Netzwerkfehler. Bitte überprüfe deine Verbindung und versuche es erneut.'
  } finally {
    isSubmitting.value = false
  }
}

// UX: Draft im SessionStorage sichern, falls Seite neu geladen wird
const STORAGE_KEY = 'contact_draft_v1'
watch(form, (val) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

try {
  const draft = sessionStorage.getItem(STORAGE_KEY)
  if (draft) {
    const parsed = JSON.parse(draft)
    form.name = parsed.name || ''
    form.email = parsed.email || ''
    form.subject = parsed.subject || ''
    form.message = parsed.message || ''
    form.consent = !!parsed.consent
  }
} catch {}
</script>

<style scoped>
.contact-wrap { margin-top: 24px; }
.contact-card { border: none; }

.title { margin: 0 0 6px 0; }
.header-row { align-items: center; }

.status-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 32px;
}

.banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  background: #151515;
  border: 1px solid var(--border);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.banner.success { color: var(--primary); border-color: var(--primary); }
.banner.danger  { color: var(--danger);  border-color: var(--danger); }
.banner.warn    { color: var(--warn);    border-color: var(--warn); }

.form.sending { opacity: 0.85; pointer-events: none; }

.field { position: relative; }
.label { display: block; margin-bottom: 6px; font-size: 13px; color: var(--muted); }

.control {
  position: relative;
  transition: box-shadow 180ms ease, transform 120ms ease;
}
.control.valid .input { border-color: grey; }
.control.invalid .input { border-color: var(--danger); }
.control:focus-within { box-shadow: 0 0 0 3px rgba(34,197,94,0.15); transform: translateZ(0); }

.input, select, textarea { transition: border-color 180ms ease, background 180ms ease; }

.hint {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--muted);
}

.textarea-ctl .hint {
  right: 0;
  top: auto;
  transform: none;
}

.textarea {
  resize: none;
  overflow: hidden;
}

.row.minor {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.msg { margin: 6px 0 0 0; font-size: 13px; }
.msg.danger { color: var(--danger); }

.checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.checkbox input { margin-top: 2px; }

.actions { align-items: center; gap: 8px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.cool { margin-left: 10px; }

.honeypot {
  position: absolute;
  left: -9999px;
  height: 0;
  width: 0;
  opacity: 0;
}

/* Animationen */
.fade-enter-active, .fade-leave-active { transition: opacity 160ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 180ms ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
