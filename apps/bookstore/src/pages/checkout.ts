// Checkout: address, delivery, a simulated payment and a review step.
//
// All four steps live inside one `<e-form>`. The three the customer is not on
// are `hidden` *and* inside a disabled `<fieldset>`, which is what keeps the
// browser's own constraint validation honest: a disabled control is barred
// from validation, so the final submit can never fail on a field the customer
// cannot see or focus.
//
// No payment details are collected anywhere. The payment step chooses a
// settlement method and nothing more.

import { bookById, FORMAT_LABELS } from '../books';
import {
  div,
  fieldValue,
  h,
  isValid,
  onDetail,
  reportValidity,
  setAttr,
  setText,
  t,
  validationMessage,
} from '../dom';
import {
  deliveryWindow,
  eur,
  EXPRESS_DELIVERY,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY,
} from '../format';
import { announce } from '../announce';
import { catalogHref, navigate } from '../router';
import {
  cartSummary,
  onStateChange,
  placeOrder,
  state,
  type DeliveryMethod,
  type Order,
} from '../state';
import type { Page } from '../page';

const STEP_TITLES = ['Address', 'Delivery', 'Payment', 'Review'];

/** Printed on the receipt when the customer left the email field blank. */
const NO_EMAIL_GIVEN = 'no address given';

/** Every control a step may hold, in the order the customer meets them. */
const CONTROL_SELECTOR =
  'e-input, e-textarea, e-select, e-radio-group, e-checkbox-group, e-checkbox, e-toggle, ' +
  'e-date-picker, e-time-picker, e-input-number, e-upload';

let goToStep: ((step: number) => void) | null = null;
let validateStep: ((step: number) => boolean) | null = null;
let submit: (() => void) | null = null;
let failNext: ((on: boolean) => void) | null = null;

/** Move the checkout to `step` (0-based). */
export function setCheckoutStep(step: number): void {
  goToStep?.(step);
}

/** Validate one step and surface its violations. Returns whether it passed. */
export function validateCheckoutStep(step: number): boolean {
  return validateStep?.(step) ?? false;
}

/** Place the order currently described by the form. */
export function submitOrder(): void {
  submit?.();
}

/** Arm or disarm the simulated payment failure. */
export function simulatePaymentFailure(on = true): void {
  failNext?.(on);
}

export function createCheckoutPage(): Page {
  let step = 0;
  let placed: Order | null = null;
  let giftArtwork = '';

  /* ---------------- step 1 · address ---------------- */

  const firstName = h('e-input', {
    name: 'first-name',
    autocomplete: 'given-name',
    required: true,
  });
  const lastName = h('e-input', { name: 'last-name', autocomplete: 'family-name', required: true });
  const street = h('e-input', {
    name: 'street',
    autocomplete: 'street-address',
    required: true,
    hint: 'Street and house number.',
  });
  const postcode = h('e-input', {
    name: 'postcode',
    autocomplete: 'postal-code',
    required: true,
    pattern: '\\d{5}',
    inputmode: 'numeric',
    hint: 'Five digits, German format.',
    'required-message': 'A five-digit German postcode is needed for delivery.',
  });
  const city = h('e-input', { name: 'city', autocomplete: 'address-level2', required: true });
  const country = h('e-select', { name: 'country', value: 'DE', required: true }, [
    h('e-option', { value: 'DE', label: 'Germany' }),
    h('e-option', { value: 'AT', label: 'Austria' }),
    h('e-option', { value: 'CH', label: 'Switzerland' }),
  ]);
  const email = h('e-input', {
    name: 'email',
    type: 'email',
    autocomplete: 'email',
    required: true,
    hint: 'Only used for the order confirmation in this demo.',
  });
  const note = h('e-textarea', {
    name: 'note',
    maxlength: 200,
    placeholder: 'Ring the second bell, please.',
  });

  const addressStep = buildStep(0, 'Delivery address', [
    h('e-grid', { cols: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }, [
      h('e-form-item', { label: 'First name', required: true }, [firstName]),
      h('e-form-item', { label: 'Last name', required: true }, [lastName]),
      h('e-grid-item', { col: 'span 2' }, [
        h('e-form-item', { label: 'Street and number', required: true }, [street]),
      ]),
      h('e-form-item', { label: 'Postcode', required: true }, [postcode]),
      h('e-form-item', { label: 'City', required: true }, [city]),
      h('e-form-item', { label: 'Country', required: true }, [country]),
      h('e-form-item', { label: 'Email', required: true }, [email]),
      h('e-grid-item', { col: 'span 2' }, [
        h('e-form-item', { label: 'Delivery note', hint: 'Optional, up to 200 characters.' }, [
          note,
        ]),
      ]),
    ]),
  ]);

  /* ---------------- step 2 · delivery ---------------- */

  const methodGroup = h(
    'e-radio-group',
    { name: 'delivery', layout: 'vertical', value: 'standard', required: true },
    [
      h('e-radio', {
        value: 'standard',
        label: `Standard · ${eur(STANDARD_DELIVERY)}, free from ${eur(FREE_DELIVERY_THRESHOLD)}`,
      }),
      h('e-radio', {
        value: 'express',
        label: `Express · ${eur(EXPRESS_DELIVERY)}, next working day`,
      }),
      h('e-radio', { value: 'pickup', label: 'Collect from the reading room · free' }),
    ],
  );
  const deliveryDate = h('e-date-picker', { name: 'delivery-date', placeholder: 'No preference' });
  const deliveryTime = h('e-time-picker', { name: 'delivery-time', value: '17:00' });
  const invoiceToggle = h('e-toggle', {
    name: 'invoice-email',
    label: 'Send the invoice by email instead of on paper',
    checked: state.preferences.invoiceByEmail,
  });
  const giftCheckbox = h('e-checkbox', { name: 'gift', label: 'This order is a gift' });
  const giftMessage = h('e-textarea', {
    name: 'gift-message',
    maxlength: 160,
    placeholder: 'For Elif — happy reading.',
  });
  const giftUpload = h('e-upload', {
    name: 'gift-artwork',
    accept: 'image/png,image/jpeg,image/svg+xml',
    'max-size': 2_000_000,
  });
  const giftPanel = div('shop-checkout__gift', [
    h('e-form-item', { label: 'Gift message', hint: 'Printed on a card, up to 160 characters.' }, [
      giftMessage,
    ]),
    h(
      'e-form-item',
      {
        label: 'Gift-card artwork',
        hint: 'Optional. PNG, JPEG or SVG up to 2 MB. Nothing is uploaded in this demo.',
      },
      [giftUpload],
    ),
  ]);
  giftPanel.hidden = true;

  const deliveryEstimate = t('e-text', { kind: 'small', as: 'p' }, '');

  const deliveryStep = buildStep(1, 'Delivery method', [
    h('e-form-item', { label: 'How should the order travel?', required: true }, [methodGroup]),
    deliveryEstimate,
    h('e-grid', { cols: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }, [
      h('e-form-item', { label: 'Preferred delivery date', hint: 'Optional.' }, [deliveryDate]),
      h('e-form-item', { label: 'Preferred time', hint: 'Optional, 24-hour clock.' }, [
        deliveryTime,
      ]),
    ]),
    h('e-divider', { variant: 'dashed', label: 'Invoice and gift' }),
    invoiceToggle,
    giftCheckbox,
    giftPanel,
  ]);

  /* ---------------- step 3 · payment ---------------- */

  const paymentGroup = h(
    'e-radio-group',
    { name: 'payment', layout: 'vertical', value: 'invoice', required: true },
    [
      h('e-radio', { value: 'invoice', label: 'Pay on invoice, 14 days' }),
      h('e-radio', { value: 'sepa', label: 'SEPA direct debit from the account on file' }),
      h('e-radio', { value: 'counter', label: 'Pay at the counter on collection' }),
    ],
  );
  const failToggle = h('e-checkbox', {
    name: 'simulate-failure',
    label: 'Simulate a declined payment on the next attempt',
  });

  const paymentStep = buildStep(2, 'Payment', [
    h('e-alert', { variant: 'info', heading: 'No payment details are collected' }, [
      'This is a demonstration shop. There is no card form, no IBAN field and no payment ' +
        'processor. Choosing a settlement method here only decides what the confirmation says.',
    ]),
    h('e-form-item', { label: 'Settlement method', required: true }, [paymentGroup]),
    h('e-divider', { variant: 'dashed', label: 'Failure path' }),
    t(
      'e-text',
      { kind: 'small', as: 'p' },
      'Switch this on to see how the shop reports a payment that does not go through.',
    ),
    failToggle,
  ]);

  /* ---------------- step 4 · review ---------------- */

  const reviewAddress = div('shop-checkout__review');
  const reviewOrder = div('shop-checkout__review');
  const reviewLines = div('shop-checkout__review');
  const termsCheckbox = h('e-checkbox', {
    name: 'terms',
    required: true,
    label: 'I accept the terms of sale and the 14-day right of withdrawal',
    'required-message': 'The terms have to be accepted before the order can be placed.',
  });
  const placeButton = t('e-button', { variant: 'primary', type: 'submit' }, 'Place the order');

  const reviewStep = buildStep(3, 'Review and confirm', [
    t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Delivering to'),
    reviewAddress,
    t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Titles'),
    reviewLines,
    t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Charges'),
    reviewOrder,
    h('e-divider', {}),
    termsCheckbox,
  ]);

  /* ---------------- chrome ---------------- */

  const steps = h(
    'e-steps',
    { current: 0 },
    STEP_TITLES.map((title, index) =>
      h('e-step', {
        title: `${index + 1}. ${title}`,
        description: ['Where it goes', 'How it travels', 'How it is settled', 'Check and confirm'][
          index
        ],
      }),
    ),
  );

  const errorText = t('span', {}, '');
  // `tabindex` so the summary can take focus: an error the customer cannot be
  // moved to is an error they have to hunt for.
  const errorAlert = h(
    'e-alert',
    { variant: 'error', heading: 'Check these fields', tabindex: -1 },
    [errorText],
  );
  errorAlert.hidden = true;

  const backButton = t('e-button', {}, 'Back');
  const nextButton = t('e-button', { variant: 'primary' }, 'Continue');

  const form = h('e-form', {}, [
    addressStep,
    deliveryStep,
    paymentStep,
    reviewStep,
    div('shop-checkout__nav', [backButton, nextButton, placeButton]),
  ]);

  const summarySlot = div('shop-checkout__summary');

  const qrcode = h('e-qrcode', { value: '', level: 'M', scale: 4, border: 2 });
  const resultActions = div('shop-checkout__result-actions');
  const result = h('e-result', { status: 'success', title: '', description: '', tabindex: -1 });
  const confirmation = div('shop-checkout__confirmation', [
    result,
    div('shop-checkout__qr', [
      qrcode,
      t(
        'e-text',
        { kind: 'small', as: 'p' },
        'Show this code at the counter. It carries the order reference only.',
      ),
    ]),
    div('shop-checkout__receipt'),
    resultActions,
  ]);
  confirmation.hidden = true;
  const receiptSlot = confirmation.querySelector<HTMLElement>('.shop-checkout__receipt')!;

  const emptyBasket = h('e-empty', {
    icon: 'folder',
    title: 'There is nothing to check out',
    description: 'Put a title in the basket first — the checkout needs at least one line.',
  });
  const emptyAction = t('e-button', { slot: 'action', variant: 'primary' }, 'Browse the catalogue');
  emptyBasket.appendChild(emptyAction);
  emptyAction.addEventListener('e-click', () => navigate(catalogHref({})));
  emptyBasket.hidden = true;

  const checkoutBody = div('shop-checkout', [
    div('shop-checkout__form', [steps, errorAlert, form]),
    h('e-card', { class: 'shop-checkout__aside', eyebrow: 'Order', title: 'Summary' }, [
      summarySlot,
    ]),
  ]);

  const el = div('shop-page shop-page--checkout', [
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'Checkout'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'Four steps. Each one validates before the next opens, and nothing here asks for a card ' +
          'number.',
      ),
    ]),
    checkoutBody,
    confirmation,
    emptyBasket,
  ]);

  /** One step: a fieldset with a visible legend, hidden and disabled when inactive. */
  function buildStep(index: number, legend: string, children: readonly HTMLElement[]): HTMLElement {
    return h('fieldset', { class: 'shop-step' }, [
      t('legend', { class: 'shop-step__legend' }, `Step ${index + 1} · ${legend}`),
      ...children,
    ]);
  }

  const stepFieldsets = [addressStep, deliveryStep, paymentStep, reviewStep];

  /* ---------------- behaviour ---------------- */

  const method = (): DeliveryMethod =>
    (methodGroup.getAttribute('value') as DeliveryMethod | null) ?? 'standard';

  function renderSummary(): void {
    const summary = cartSummary(method());
    const rows: Array<[string, string]> = [
      ['Titles', String(summary.itemCount)],
      ['Subtotal', eur(summary.subtotal)],
      [`Delivery (${method()})`, summary.delivery === 0 ? 'Free' : eur(summary.delivery)],
    ];
    if (summary.discount > 0 && summary.voucher) {
      rows.push([`Voucher ${summary.voucher.code}`, `− ${eur(summary.discount)}`]);
    }
    rows.push(['Total', eur(summary.total)]);
    rows.push(['Included VAT (7 %)', eur(summary.vat)]);
    summarySlot.replaceChildren(
      h(
        'e-description-list',
        { columns: 1, bordered: true },
        rows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );

    setText(
      deliveryEstimate,
      method() === 'pickup'
        ? 'Ready for collection the next working day, Mon–Sat 10:00–18:30.'
        : `Estimated arrival ${deliveryWindow(method() === 'express' ? 1 : 3)}.`,
    );
  }

  function renderReview(): void {
    const summary = cartSummary(method());
    const addressRows: Array<[string, string]> = [
      ['Name', `${fieldValue(firstName)} ${fieldValue(lastName)}`.trim() || '—'],
      ['Street', fieldValue(street) || '—'],
      ['Town', `${fieldValue(postcode)} ${fieldValue(city)}`.trim() || '—'],
      ['Country', country.getAttribute('value') ?? 'DE'],
      ['Email', fieldValue(email) || '—'],
      ['Delivery', method()],
      ['Preferred date', deliveryDate.getAttribute('value') || 'No preference'],
      ['Preferred time', deliveryTime.getAttribute('value') ?? '—'],
      ['Invoice', invoiceToggle.hasAttribute('checked') ? 'By email' : 'On paper with the parcel'],
      ['Payment', paymentGroup.getAttribute('value') ?? 'invoice'],
      [
        'Gift',
        giftCheckbox.hasAttribute('checked')
          ? `Yes${giftArtwork ? ` · artwork ${giftArtwork}` : ''}`
          : 'No',
      ],
    ];
    if (giftCheckbox.hasAttribute('checked') && fieldValue(giftMessage)) {
      addressRows.push(['Gift message', fieldValue(giftMessage)]);
    }
    if (fieldValue(note)) addressRows.push(['Note', fieldValue(note)]);

    reviewAddress.replaceChildren(
      h(
        'e-description-list',
        { columns: 2, bordered: true, layout: 'vertical' },
        addressRows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );

    const lines = h('e-list', { bordered: true, split: true });
    for (const line of state.cart) {
      const book = bookById(line.id);
      if (!book) continue;
      const unit = book.formats.find((option) => option.id === line.format)?.price ?? 0;
      lines.appendChild(
        h('e-list-item', {
          title: `${line.quantity} × ${book.title}`,
          description: `${FORMAT_LABELS[line.format]} · ${eur(unit)} each · ${eur(unit * line.quantity)}`,
        }),
      );
    }
    reviewLines.replaceChildren(lines);

    const chargeRows: Array<[string, string]> = [
      ['Subtotal', eur(summary.subtotal)],
      ['Delivery', summary.delivery === 0 ? 'Free' : eur(summary.delivery)],
    ];
    if (summary.discount > 0 && summary.voucher) {
      chargeRows.push([`Voucher ${summary.voucher.code}`, `− ${eur(summary.discount)}`]);
    }
    chargeRows.push(['Total to pay', eur(summary.total)]);
    reviewOrder.replaceChildren(
      h(
        'e-description-list',
        { columns: 1, bordered: true },
        chargeRows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );
  }

  function applyStep(): void {
    stepFieldsets.forEach((fieldset, index) => {
      const active = index === step;
      fieldset.hidden = !active;
      // Disabled, not merely hidden: a disabled control is barred from
      // constraint validation, so the browser never tries to focus a field on
      // a step the customer is not looking at.
      setAttr(fieldset, 'disabled', active ? null : '');
    });
    setAttr(steps, 'current', String(step));
    setAttr(backButton, 'hidden', step === 0 ? '' : null);
    setAttr(nextButton, 'hidden', step === STEP_TITLES.length - 1 ? '' : null);
    setAttr(placeButton, 'hidden', step === STEP_TITLES.length - 1 ? null : '');
    if (step === STEP_TITLES.length - 1) renderReview();
  }

  function focusStep(): void {
    const legend = stepFieldsets[step]?.querySelector<HTMLElement>('legend');
    legend?.setAttribute('tabindex', '-1');
    legend?.focus({ preventScroll: true });
  }

  function setStep(next: number): void {
    const clamped = Math.max(0, Math.min(STEP_TITLES.length - 1, next));
    if (clamped === step) return;
    step = clamped;
    errorAlert.hidden = true;
    applyStep();
    focusStep();
    announce(`Step ${step + 1} of ${STEP_TITLES.length}: ${STEP_TITLES[step]}.`);
  }

  /** Visible name of a control: its form-item label, then its own. */
  const labelOf = (control: HTMLElement): string =>
    control.closest('e-form-item')?.getAttribute('label') ??
    control.getAttribute('label') ??
    'a field';

  function validate(index: number): boolean {
    const fieldset = stepFieldsets[index];
    if (!fieldset) return false;
    const controls = [...fieldset.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)];
    const failed: HTMLElement[] = [];

    for (const control of controls) {
      const item = control.closest('e-form-item');
      const ok = isValid(control);
      if (ok) {
        item?.removeAttribute('error');
        continue;
      }
      failed.push(control);
      const message = validationMessage(control) || 'This field needs a value.';
      item?.setAttribute('error', message);
    }

    if (failed.length === 0) {
      errorAlert.hidden = true;
      return true;
    }

    const names = failed.map(labelOf).join(', ');
    setAttr(errorAlert, 'heading', 'Check these fields');
    setText(errorText, `${names}. Fill these in and try again.`);
    errorAlert.hidden = false;
    reportValidity(failed[0]!);
    failed[0]!.focus();
    announce(`${failed.length} field${failed.length === 1 ? '' : 's'} need attention: ${names}.`);
    return false;
  }

  function finish(): void {
    if (!validate(3)) return;
    if (failToggle.hasAttribute('checked')) {
      setAttr(errorAlert, 'heading', 'Payment declined');
      setText(
        errorText,
        'The simulated payment provider rejected this order. Nothing was charged and the basket ' +
          'is untouched — switch the simulation off on the payment step and try again.',
      );
      errorAlert.hidden = false;
      announce('Payment declined. The basket is untouched.');
      errorAlert.focus();
      return;
    }

    const summary = cartSummary(method());
    const order = placeOrder(method(), summary.total);
    placed = order;

    setAttr(result, 'title', `Order ${order.id} confirmed`);
    setAttr(
      result,
      'description',
      method() === 'pickup'
        ? `Ready for collection from tomorrow. Total ${eur(order.total)}, payable at the counter.`
        : `Arriving ${deliveryWindow(method() === 'express' ? 1 : 3)}. Total ${eur(order.total)}.`,
    );
    setAttr(qrcode, 'value', `INKBOUND:${order.id}:${order.total.toFixed(2)}EUR`);

    const rows: Array<[string, string]> = [
      ['Order number', order.id],
      ['Placed', order.placed],
      ['Delivery', order.delivery],
      ['Titles', String(order.lines.reduce((sum, line) => sum + line.quantity, 0))],
      ['Total', eur(order.total)],
      ['Confirmation sent to', fieldValue(email) || NO_EMAIL_GIVEN],
    ];
    receiptSlot.replaceChildren(
      h(
        'e-description-list',
        { columns: 2, bordered: true, layout: 'vertical' },
        rows.map(([term, detail]) => t('e-desc-item', { term }, detail)),
      ),
    );

    const toShop = t('e-button', { variant: 'primary' }, 'Back to the shop');
    toShop.addEventListener('e-click', () => navigate('/'));
    const toAccount = t('e-button', {}, 'See it in your account');
    toAccount.addEventListener('e-click', () => navigate('/account'));
    resultActions.replaceChildren(h('e-space', { size: 12, wrap: true }, [toShop, toAccount]));

    checkoutBody.hidden = true;
    confirmation.hidden = false;
    errorAlert.hidden = true;
    announce(`Order ${order.id} confirmed. Total ${eur(order.total)}.`);
    result.focus();
  }

  goToStep = setStep;
  validateStep = validate;
  submit = finish;
  failNext = (on: boolean) => {
    setAttr(failToggle, 'checked', on ? '' : null);
  };

  nextButton.addEventListener('e-click', () => {
    if (!validate(step)) return;
    setStep(step + 1);
  });
  backButton.addEventListener('e-click', () => setStep(step - 1));
  onDetail<{ form: HTMLFormElement }>(form, 'e-submit', () => finish());

  onDetail<{ value: string }>(methodGroup, 'e-change', ({ value }) => {
    renderSummary();
    announce(`Delivery method: ${value}.`);
  });

  onDetail<{ checked: boolean }>(giftCheckbox, 'e-change', ({ checked }) => {
    giftPanel.hidden = !checked;
    announce(checked ? 'Gift options opened.' : 'Gift options closed.');
  });

  onDetail<{ files: File[] }>(giftUpload, 'e-change', ({ files }) => {
    giftArtwork = files[0]?.name ?? '';
    announce(giftArtwork ? `Artwork ${giftArtwork} attached.` : 'Artwork removed.');
  });

  onDetail<{ checked: boolean }>(failToggle, 'e-change', ({ checked }) => {
    announce(checked ? 'The next attempt will be declined.' : 'Payment simulation set to succeed.');
  });

  onStateChange(() => {
    if (!confirmation.hidden) return;
    renderSummary();
  });

  applyStep();
  renderSummary();

  return {
    el,
    sider: null,
    enter() {
      const empty = state.cart.length === 0 && placed == null;
      emptyBasket.hidden = !empty;
      checkoutBody.hidden = empty || placed != null;
      confirmation.hidden = placed == null;
      if (!empty && placed == null) renderSummary();
      return {
        title: 'Checkout',
        trail: [
          { label: 'Shop', href: '#/' },
          { label: 'Basket', href: '#/cart' },
          { label: 'Checkout' },
        ],
      };
    },
    leave() {
      // A confirmed order is shown once. Leaving the page returns the checkout
      // to its empty state so a second visit starts a new order rather than
      // re-showing the last receipt.
      if (placed) {
        placed = null;
        confirmation.hidden = true;
        checkoutBody.hidden = false;
        step = 0;
        applyStep();
      }
    },
  };
}
