import { useCallback, useMemo, useState } from 'react'
import { EMPLOYEE_STRENGTH_OPTIONS, INDUSTRY_SUGGESTIONS } from '../../api/auth.js'
import { useAuth } from '../../auth/AuthContext.js'
import { isAbortError } from '../../api/http.js'
import {
  MIN_PASSWORD_LENGTH,
  validateChoice,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePasswordConfirmation,
  validatePhone,
  validateRequiredText,
} from '../../utils/validation.js'
import Field from './Field.jsx'
import PasswordStrength from './PasswordStrength.jsx'
import {
  ArrowIcon,
  BadgeIcon,
  BuildingIcon,
  IndustryIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  TeamIcon,
  UserIcon,
} from './Icons.jsx'

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  designation: '',
  employeeStrength: '',
  companyIndustry: '',
}

/**
 * Nine fields is a long scroll and a discouraging one, so they are split in
 * two: who you are, then where you work. Step 1 is validated before step 2
 * appears, which means a typo in the email is caught while the user is still
 * thinking about their email.
 */
const STEPS = [
  { title: 'Your account', fields: ['fullName', 'email', 'phone', 'password', 'confirmPassword'] },
  {
    title: 'Your company',
    fields: ['companyName', 'designation', 'employeeStrength', 'companyIndustry'],
  },
]

export default function SignUpForm({ onSwitchToSignIn }) {
  const { signUp, pending } = useAuth()

  const [step, setStep] = useState(0)
  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const set = (field) => (value) => setValues((current) => ({ ...current, [field]: value }))

  const validate = useCallback(
    () => ({
      fullName: validateName(values.fullName),
      // Both are required: login accepts either as the identifier, and there
      // is no signing in with a phone number the account never stored.
      email: validateEmail(values.email),
      phone: validatePhone(values.phone),
      password: validateNewPassword(values.password),
      confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword),
      companyName: validateRequiredText(values.companyName, { label: 'company name' }),
      designation: validateRequiredText(values.designation, { label: 'designation', max: 80 }),
      employeeStrength: validateChoice(values.employeeStrength, EMPLOYEE_STRENGTH_OPTIONS, {
        label: 'team size',
      }),
      companyIndustry: validateRequiredText(values.companyIndustry, { label: 'industry' }),
    }),
    [values],
  )

  const markTouched = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors(validate())
  }

  const errorFor = (field) => (touched[field] ? errors[field] : null)

  /** Only the fields on screen gate the button; the rest are not asked yet. */
  const stepIsClean = useMemo(() => {
    const found = validate()
    return STEPS[step].fields.every((field) => !found[field])
  }, [validate, step])

  const showStepErrors = () => {
    setErrors(validate())
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(STEPS[step].fields.map((field) => [field, true])),
    }))
  }

  const goNext = () => {
    showStepErrors()
    if (stepIsClean) setStep(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pending) return

    // Enter on step 1 should advance, not submit a half-filled form.
    if (step === 0) {
      goNext()
      return
    }

    const found = validate()
    setErrors(found)
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((field) => [field, true])))

    // A problem left behind on step 1 has to send the user back to it — an
    // error message on a field nobody can see is a dead end.
    if (STEPS[0].fields.some((field) => found[field])) {
      setStep(0)
      return
    }
    if (Object.values(found).some(Boolean)) return

    setFormError(null)
    try {
      // Signing up signs you in, so there is no "now go and log in" detour.
      await signUp(values, { remember: true })
    } catch (err) {
      if (isAbortError(err)) return
      setFormError(err.message)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-head">
        <h2>Create your account</h2>
        <p className="muted">Two short steps, then you can upload your first document.</p>
      </div>

      <ol className="steps" aria-label="Signup progress">
        {STEPS.map((definition, index) => (
          <li
            key={definition.title}
            className={`step${index === step ? ' step-active' : ''}${
              index < step ? ' step-done' : ''
            }`}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className="step-dot">{index < step ? '✓' : index + 1}</span>
            <span className="step-title">{definition.title}</span>
          </li>
        ))}
        <li className="step-rail" aria-hidden="true">
          <span className="step-rail-fill" style={{ '--progress': step / (STEPS.length - 1) }} />
        </li>
      </ol>

      {formError && (
        <div className="notice notice-error shake" role="alert">
          <strong>Could not create your account</strong>
          <p>{formError}</p>
        </div>
      )}

      {/* Keyed so React rebuilds the panel on a step change and the entrance
          animation actually replays. */}
      <div className="step-panel" key={step}>
        {step === 0 ? (
          <>
            <div className="stagger" style={{ '--i': 0 }}>
              <Field
                label="Full name"
                value={values.fullName}
                onChange={set('fullName')}
                onBlur={markTouched('fullName')}
                error={errorFor('fullName')}
                icon={<UserIcon />}
                autoComplete="name"
                placeholder="Ada Lovelace"
                disabled={pending}
                autoFocus
              />
            </div>

            <div className="field-row stagger" style={{ '--i': 1 }}>
              <Field
                label="Work email"
                type="email"
                value={values.email}
                onChange={set('email')}
                onBlur={markTouched('email')}
                error={errorFor('email')}
                icon={<MailIcon />}
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                disabled={pending}
              />
              <Field
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={set('phone')}
                onBlur={markTouched('phone')}
                error={errorFor('phone')}
                hint="You can sign in with either one."
                icon={<PhoneIcon />}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+91 98765 43210"
                disabled={pending}
              />
            </div>

            <div className="stagger" style={{ '--i': 2 }}>
              <Field
                label="Password"
                type="password"
                value={values.password}
                onChange={set('password')}
                onBlur={markTouched('password')}
                error={errorFor('password')}
                hint={`At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number.`}
                icon={<LockIcon />}
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={pending}
              >
                <PasswordStrength value={values.password} />
              </Field>
            </div>

            <div className="stagger" style={{ '--i': 3 }}>
              <Field
                label="Confirm password"
                type="password"
                value={values.confirmPassword}
                onChange={set('confirmPassword')}
                onBlur={markTouched('confirmPassword')}
                error={errorFor('confirmPassword')}
                icon={<LockIcon />}
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={pending}
              />
            </div>

            <button
              type="button"
              className="btn btn-glow btn-block stagger"
              style={{ '--i': 4 }}
              onClick={goNext}
              disabled={pending}
            >
              Continue
              <ArrowIcon />
            </button>
          </>
        ) : (
          <>
            <div className="stagger" style={{ '--i': 0 }}>
              <Field
                label="Company name"
                value={values.companyName}
                onChange={set('companyName')}
                onBlur={markTouched('companyName')}
                error={errorFor('companyName')}
                icon={<BuildingIcon />}
                autoComplete="organization"
                placeholder="Analytical Engines Ltd"
                disabled={pending}
                autoFocus
              />
            </div>

            <div className="field-row stagger" style={{ '--i': 1 }}>
              <Field
                label="Your designation"
                value={values.designation}
                onChange={set('designation')}
                onBlur={markTouched('designation')}
                error={errorFor('designation')}
                icon={<BadgeIcon />}
                autoComplete="organization-title"
                placeholder="Head of Talent"
                disabled={pending}
              />
              <Field
                label="Team size"
                value={values.employeeStrength}
                onChange={set('employeeStrength')}
                onBlur={markTouched('employeeStrength')}
                error={errorFor('employeeStrength')}
                icon={<TeamIcon />}
                options={EMPLOYEE_STRENGTH_OPTIONS}
                placeholder="Select…"
                disabled={pending}
              />
            </div>

            <div className="stagger" style={{ '--i': 2 }}>
              <Field
                label="Industry"
                value={values.companyIndustry}
                onChange={set('companyIndustry')}
                onBlur={markTouched('companyIndustry')}
                error={errorFor('companyIndustry')}
                hint="Pick one, or type your own."
                icon={<IndustryIcon />}
                // A free-text input with suggestions behind it, so an industry
                // nobody put on the list still gets through.
                suggestions={INDUSTRY_SUGGESTIONS}
                placeholder="Staffing & Recruiting"
                disabled={pending}
              />
            </div>

            <div className="step-actions stagger" style={{ '--i': 3 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setStep(0)}
                disabled={pending}
              >
                Back
              </button>
              <button type="submit" className="btn btn-glow" disabled={pending}>
                {pending ? <span className="btn-working">Creating your account</span> : 'Create account'}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="btn-link" onClick={onSwitchToSignIn} disabled={pending}>
          Sign in
        </button>
      </p>
    </form>
  )
}
