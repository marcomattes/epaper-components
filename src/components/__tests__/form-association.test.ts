// Smoke tests for the form-association migration. Each interactive form
// component must round-trip through `new FormData(form)` when given a `name`.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../input');
  await import('../textarea');
  await import('../checkbox');
  await import('../toggle');
  await import('../select');
  await import('../radio-group');
  await import('../checkbox-group');
  await import('../date-picker');
  await import('../time-picker');
  await import('../cascader');
  await import('../tree-select');
  await import('../button');
  await import('../upload');
  await import('../input-number');
});

const mount = (html: string): HTMLFormElement => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.querySelector('form')!;
};

describe('form association', () => {
  it('e-input value round-trips through FormData', () => {
    const form = mount(`<form><e-input name="a" value="hello"></e-input></form>`);
    const fd = new FormData(form);
    expect(fd.get('a')).toBe('hello');
  });

  it('e-textarea value round-trips through FormData', () => {
    const form = mount(`<form><e-textarea name="t" value="line"></e-textarea></form>`);
    expect(new FormData(form).get('t')).toBe('line');
  });

  it('e-checkbox submits its value when checked, omits when not', () => {
    const form = mount(
      `<form>
        <e-checkbox name="c1" checked></e-checkbox>
        <e-checkbox name="c2"></e-checkbox>
       </form>`,
    );
    const fd = new FormData(form);
    expect(fd.get('c1')).toBe('on');
    expect(fd.get('c2')).toBeNull();
  });

  it('e-toggle submits its value when checked', () => {
    const form = mount(`<form><e-toggle name="t" checked></e-toggle></form>`);
    expect(new FormData(form).get('t')).toBe('on');
  });

  it('e-select submits its current value', () => {
    const form = mount(
      `<form>
        <e-select name="s" value="b">
          <e-option value="a" label="A"></e-option>
          <e-option value="b" label="B"></e-option>
        </e-select>
       </form>`,
    );
    expect(new FormData(form).get('s')).toBe('b');
  });

  it('e-radio-group submits its current value', () => {
    const form = mount(
      `<form>
        <e-radio-group name="r" value="x">
          <e-radio value="x" label="X"></e-radio>
          <e-radio value="y" label="Y"></e-radio>
        </e-radio-group>
       </form>`,
    );
    expect(new FormData(form).get('r')).toBe('x');
  });

  it('e-checkbox-group submits one entry per selected option', () => {
    const form = mount(
      `<form>
        <e-checkbox-group name="g" value="a,b">
          <e-cbox-option value="a" label="A"></e-cbox-option>
          <e-cbox-option value="b" label="B"></e-cbox-option>
          <e-cbox-option value="c" label="C"></e-cbox-option>
        </e-checkbox-group>
       </form>`,
    );
    const fd = new FormData(form);
    expect(fd.getAll('g')).toEqual(['a', 'b']);
  });

  it('e-date-picker submits its YYYY-MM-DD value', () => {
    const form = mount(`<form><e-date-picker name="d" value="2026-04-26"></e-date-picker></form>`);
    expect(new FormData(form).get('d')).toBe('2026-04-26');
  });

  it('e-time-picker submits its HH:MM value', () => {
    const form = mount(`<form><e-time-picker name="t" value="09:30"></e-time-picker></form>`);
    expect(new FormData(form).get('t')).toBe('09:30');
  });

  it('e-cascader submits the path joined by ","', () => {
    const opts = JSON.stringify([
      { value: 'eu', label: 'Europe', children: [{ value: 'de', label: 'DE' }] },
    ]);
    const form = mount(
      `<form><e-cascader name="loc" options='${opts}' value="eu,de"></e-cascader></form>`,
    );
    expect(new FormData(form).get('loc')).toBe('eu,de');
  });

  it('e-tree-select submits its selected node value', () => {
    const data = JSON.stringify([{ value: 'a', label: 'A' }]);
    const form = mount(
      `<form><e-tree-select name="n" data='${data}' value="a"></e-tree-select></form>`,
    );
    expect(new FormData(form).get('n')).toBe('a');
  });

  it('form reset restores the default value', () => {
    const form = mount(`<form><e-input name="i" default-value="abc" value="xyz"></e-input></form>`);
    const input = form.querySelector('e-input') as HTMLElement & { value: string };
    expect(new FormData(form).get('i')).toBe('xyz');
    form.reset();
    expect(input.value).toBe('abc');
  });

  it('e-checkbox-group resets to default-value', () => {
    const form = mount(
      `<form>
        <e-checkbox-group name="g" default-value="a" value="a,b,c">
          <e-cbox-option value="a" label="A"></e-cbox-option>
          <e-cbox-option value="b" label="B"></e-cbox-option>
          <e-cbox-option value="c" label="C"></e-cbox-option>
        </e-checkbox-group>
       </form>`,
    );
    const group = form.querySelector('e-checkbox-group') as HTMLElement & {
      value: string;
    };
    expect(group.value).toBe('a,b,c');
    form.reset();
    expect(group.value).toBe('a');
    const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputs[0].checked).toBe(true);
    expect(inputs[1].checked).toBe(false);
    expect(inputs[2].checked).toBe(false);
  });

  it('e-button type="submit" triggers a submit event on the surrounding form', () => {
    const form = mount(`<form><e-button type="submit">Go</e-button></form>`);
    let submitted = 0;
    form.addEventListener('submit', (e) => {
      submitted++;
      e.preventDefault();
    });
    const btn = form.querySelector('e-button')!.firstElementChild as HTMLButtonElement;
    btn.click();
    expect(submitted).toBe(1);
  });

  it('e-button type="reset" triggers formResetCallback on form controls', () => {
    const form = mount(
      `<form>
        <e-input name="x" default-value="abc" value="xyz"></e-input>
        <e-button type="reset">Reset</e-button>
       </form>`,
    );
    const input = form.querySelector('e-input') as HTMLElement & { value: string };
    expect(input.value).toBe('xyz');
    const btn = form.querySelector('e-button')!.firstElementChild as HTMLButtonElement;
    btn.click();
    expect(input.value).toBe('abc');
  });

  it('e-button default type does not submit the form', () => {
    const form = mount(`<form><e-button>Plain</e-button></form>`);
    let submitted = 0;
    form.addEventListener('submit', (e) => {
      submitted++;
      e.preventDefault();
    });
    const btn = form.querySelector('e-button')!.firstElementChild as HTMLButtonElement;
    btn.click();
    expect(submitted).toBe(0);
  });

  it('e-button disabled suppresses submit', () => {
    const form = mount(`<form><e-button type="submit" disabled>Go</e-button></form>`);
    let submitted = 0;
    form.addEventListener('submit', (e) => {
      submitted++;
      e.preventDefault();
    });
    const btn = form.querySelector('e-button')!.firstElementChild as HTMLButtonElement;
    btn.click();
    expect(submitted).toBe(0);
  });

  it('e-upload submits a single File when not multiple', () => {
    const form = mount(`<form><e-upload name="f"></e-upload></form>`);
    const upload = form.querySelector('e-upload') as HTMLElement & { value: File[] };
    const file = new File(['hello'], 'a.txt', { type: 'text/plain' });
    upload.value = [file];
    const got = new FormData(form).get('f');
    expect(got).toBeInstanceOf(File);
    expect((got as File).name).toBe('a.txt');
  });

  it('e-upload submits multiple Files in multi-mode', () => {
    const form = mount(`<form><e-upload name="f" multiple></e-upload></form>`);
    const upload = form.querySelector('e-upload') as HTMLElement & { value: File[] };
    upload.value = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];
    const got = new FormData(form).getAll('f');
    expect(got).toHaveLength(2);
    expect((got[0] as File).name).toBe('a.txt');
    expect((got[1] as File).name).toBe('b.txt');
  });

  it('e-upload form reset clears the file list', () => {
    const form = mount(`<form><e-upload name="f" multiple></e-upload></form>`);
    const upload = form.querySelector('e-upload') as HTMLElement & { value: File[] };
    upload.value = [new File(['a'], 'a.txt')];
    expect(upload.value).toHaveLength(1);
    form.reset();
    expect(upload.value).toHaveLength(0);
    expect(new FormData(form).get('f')).toBeNull();
    const list = upload.querySelector('.ink-upload__list') as HTMLElement;
    expect(list.hidden).toBe(true);
  });

  it('e-upload max-files marks the control invalid', () => {
    const form = mount(`<form><e-upload name="f" multiple max-files="1"></e-upload></form>`);
    const upload = form.querySelector('e-upload') as HTMLElement & {
      value: File[];
      checkValidity(): boolean;
    };
    // Programmatic value-set bypasses validation by design (mirrors the way
    // <input> handles it). Use the internal handler to simulate a drop.
    const drop = upload.querySelector('.ink-upload') as HTMLElement;
    const dt = new DataTransfer();
    dt.items.add(new File(['a'], 'a.txt'));
    dt.items.add(new File(['b'], 'b.txt'));
    drop.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
    );
    expect(upload.checkValidity()).toBe(false);
  });

  it('e-input-number value round-trips through FormData', () => {
    const form = mount(`<form><e-input-number name="n" value="7"></e-input-number></form>`);
    expect(new FormData(form).get('n')).toBe('7');
  });

  it('e-input-number reflects step-button changes into FormData', () => {
    const form = mount(
      `<form><e-input-number name="n" value="3" step="1"></e-input-number></form>`,
    );
    const num = form.querySelector('e-input-number')!;
    const inc = num.querySelector<HTMLButtonElement>('[data-step="1"]')!;
    inc.click();
    expect(new FormData(form).get('n')).toBe('4');
  });

  it('e-input-number resets to default-value', () => {
    const form = mount(
      `<form><e-input-number name="n" default-value="2" value="9"></e-input-number></form>`,
    );
    const num = form.querySelector('e-input-number') as HTMLElement & { value: string };
    expect(new FormData(form).get('n')).toBe('9');
    form.reset();
    expect(num.value).toBe('2');
    expect(new FormData(form).get('n')).toBe('2');
  });

  it('e-input error attribute marks the control invalid via ElementInternals', () => {
    const form = mount(`<form><e-input name="i" error error-message="Required"></e-input></form>`);
    const inp = form.querySelector('e-input') as HTMLElement & {
      checkValidity(): boolean;
      validationMessage: string;
    };
    expect(inp.checkValidity()).toBe(false);
    expect(form.checkValidity()).toBe(false);
    expect(inp.validationMessage).toBe('Required');
    inp.removeAttribute('error');
    expect(inp.checkValidity()).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it('e-textarea error attribute marks the control invalid via ElementInternals', () => {
    const form = mount(`<form><e-textarea name="t" error></e-textarea></form>`);
    const ta = form.querySelector('e-textarea') as HTMLElement & {
      checkValidity(): boolean;
    };
    expect(ta.checkValidity()).toBe(false);
    expect(form.checkValidity()).toBe(false);
    ta.removeAttribute('error');
    expect(ta.checkValidity()).toBe(true);
  });

  it('e-textarea resets to default-value and dispatches e-change', () => {
    const form = mount(
      `<form><e-textarea name="t" default-value="orig" value="changed"></e-textarea></form>`,
    );
    const ta = form.querySelector('e-textarea') as HTMLElement & { value: string };
    let changes = 0;
    ta.addEventListener('e-change', () => changes++);
    const native = ta.querySelector('textarea')!;
    native.value = 'edited';
    native.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changes).toBe(1);
    expect(ta.value).toBe('edited');
    form.reset();
    expect(ta.value).toBe('orig');
    expect(new FormData(form).get('t')).toBe('orig');
  });

  it('e-cascader resets to default-value', () => {
    const opts = JSON.stringify([
      {
        value: 'eu',
        label: 'Europe',
        children: [
          { value: 'de', label: 'DE' },
          { value: 'fr', label: 'FR' },
        ],
      },
    ]);
    const form = mount(
      `<form><e-cascader name="loc" options='${opts}' default-value="eu,de" value="eu,fr"></e-cascader></form>`,
    );
    const casc = form.querySelector('e-cascader') as HTMLElement & { value: string };
    expect(casc.value).toBe('eu,fr');
    form.reset();
    expect(casc.value).toBe('eu,de');
    expect(new FormData(form).get('loc')).toBe('eu,de');
  });

  it('e-tree-select resets to default-value', () => {
    const data = JSON.stringify([
      { value: 'a', label: 'A', children: [{ value: 'a1', label: 'A1' }] },
    ]);
    const form = mount(
      `<form><e-tree-select name="n" data='${data}' default-value="a" value="a1"></e-tree-select></form>`,
    );
    const tree = form.querySelector('e-tree-select') as HTMLElement & { value: string };
    expect(tree.value).toBe('a1');
    form.reset();
    expect(tree.value).toBe('a');
    expect(new FormData(form).get('n')).toBe('a');
  });

  it('e-date-picker resets to default-value and patches the trigger', () => {
    const form = mount(
      `<form><e-date-picker name="d" default-value="2026-01-15" value="2026-04-26"></e-date-picker></form>`,
    );
    const dp = form.querySelector('e-date-picker') as HTMLElement & { value: string };
    expect(dp.value).toBe('2026-04-26');
    form.reset();
    expect(dp.value).toBe('2026-01-15');
    expect(new FormData(form).get('d')).toBe('2026-01-15');
    const trigger = dp.querySelector('.ink-datepicker__trigger span')!;
    expect(trigger.textContent).toBe('2026-01-15');
  });

  it('e-time-picker resets to default-value and patches the cells', () => {
    const form = mount(
      `<form><e-time-picker name="t" default-value="06:15" value="22:45"></e-time-picker></form>`,
    );
    const tp = form.querySelector('e-time-picker') as HTMLElement & { value: string };
    expect(tp.value).toBe('22:45');
    form.reset();
    expect(tp.value).toBe('06:15');
    expect(new FormData(form).get('t')).toBe('06:15');
    const cells = tp.querySelectorAll('.ink-timepicker__cell');
    expect(cells[0].textContent).toBe('06');
    expect(cells[1].textContent).toBe('15');
  });

  it('formStateRestoreCallback rehydrates a string control', () => {
    const form = mount(`<form><e-input name="i"></e-input></form>`);
    const inp = form.querySelector('e-input') as HTMLElement & {
      value: string;
      formStateRestoreCallback(s: unknown): void;
    };
    inp.formStateRestoreCallback('restored');
    expect(inp.value).toBe('restored');
    expect(new FormData(form).get('i')).toBe('restored');
  });

  it('formStateRestoreCallback rehydrates a checkbox-group from FormData', () => {
    const form = mount(
      `<form>
        <e-checkbox-group name="g">
          <e-cbox-option value="a" label="A"></e-cbox-option>
          <e-cbox-option value="b" label="B"></e-cbox-option>
          <e-cbox-option value="c" label="C"></e-cbox-option>
        </e-checkbox-group>
       </form>`,
    );
    const grp = form.querySelector('e-checkbox-group') as HTMLElement & {
      value: string;
      formStateRestoreCallback(s: unknown): void;
    };
    const fd = new FormData();
    fd.append('g', 'a');
    fd.append('g', 'c');
    grp.formStateRestoreCallback(fd);
    expect(grp.value).toBe('a,c');
    expect(new FormData(form).getAll('g')).toEqual(['a', 'c']);
  });

  it('formStateRestoreCallback rehydrates an upload from FormData', () => {
    const form = mount(`<form><e-upload name="f" multiple></e-upload></form>`);
    const up = form.querySelector('e-upload') as HTMLElement & {
      value: File[];
      formStateRestoreCallback(s: unknown): void;
    };
    const fd = new FormData();
    fd.append('f', new File(['a'], 'a.txt'));
    fd.append('f', new File(['b'], 'b.txt'));
    up.formStateRestoreCallback(fd);
    expect(up.value).toHaveLength(2);
    expect(up.value[0].name).toBe('a.txt');
  });

  it('formStateRestoreCallback rehydrates a single-file upload from File', () => {
    const form = mount(`<form><e-upload name="f"></e-upload></form>`);
    const up = form.querySelector('e-upload') as HTMLElement & {
      value: File[];
      formStateRestoreCallback(s: unknown): void;
    };
    up.formStateRestoreCallback(new File(['x'], 'x.txt'));
    expect(up.value).toHaveLength(1);
    expect(up.value[0].name).toBe('x.txt');
  });

  const requiredCases: Array<{
    name: string;
    html: string;
    satisfy: (control: HTMLElement) => void;
  }> = [
    {
      name: 'e-input',
      html: '<e-input name="v" required></e-input>',
      satisfy: (el) => el.setAttribute('value', 'Ada'),
    },
    {
      name: 'e-textarea',
      html: '<e-textarea name="v" required></e-textarea>',
      satisfy: (el) => el.setAttribute('value', 'Notes'),
    },
    {
      name: 'e-checkbox',
      html: '<e-checkbox name="v" required></e-checkbox>',
      satisfy: (el) => el.setAttribute('checked', ''),
    },
    {
      name: 'e-toggle',
      html: '<e-toggle name="v" required></e-toggle>',
      satisfy: (el) => el.setAttribute('checked', ''),
    },
    {
      name: 'e-select',
      html: '<e-select name="v" required><e-option value="a" label="A"></e-option></e-select>',
      satisfy: (el) => el.setAttribute('value', 'a'),
    },
    {
      name: 'e-radio-group',
      html: '<e-radio-group name="v" required><e-radio value="a" label="A"></e-radio></e-radio-group>',
      satisfy: (el) => el.setAttribute('value', 'a'),
    },
    {
      name: 'e-checkbox-group',
      html: '<e-checkbox-group name="v" required><e-cbox-option value="a" label="A"></e-cbox-option></e-checkbox-group>',
      satisfy: (el) => el.setAttribute('value', 'a'),
    },
    {
      name: 'e-input-number',
      html: '<e-input-number name="v" required></e-input-number>',
      satisfy: (el) => el.setAttribute('value', '1'),
    },
    {
      name: 'e-date-picker',
      html: '<e-date-picker name="v" required></e-date-picker>',
      satisfy: (el) => el.setAttribute('value', '2026-08-17'),
    },
    {
      name: 'e-cascader',
      html: '<e-cascader name="v" required data=\'[{"value":"a","label":"A"}]\'></e-cascader>',
      satisfy: (el) => el.setAttribute('value', 'a'),
    },
    {
      name: 'e-tree-select',
      html: '<e-tree-select name="v" required data=\'[{"value":"a","label":"A"}]\'></e-tree-select>',
      satisfy: (el) => el.setAttribute('value', 'a'),
    },
    {
      name: 'e-upload',
      html: '<e-upload name="v" required></e-upload>',
      satisfy: (el) => {
        (el as HTMLElement & { value: File[] }).value = [new File(['a'], 'a.txt')];
      },
    },
  ];

  for (const testCase of requiredCases) {
    it(`${testCase.name} mirrors required through ElementInternals`, () => {
      const form = mount(`<form>${testCase.html}</form>`);
      const control = form.firstElementChild as HTMLElement & { checkValidity(): boolean };
      expect(control.checkValidity()).toBe(false);
      expect(form.checkValidity()).toBe(false);
      testCase.satisfy(control);
      expect(control.checkValidity()).toBe(true);
      expect(form.checkValidity()).toBe(true);
    });
  }

  it('e-time-picker has a valid required default of 00:00', () => {
    const form = mount('<form><e-time-picker name="v" required></e-time-picker></form>');
    const control = form.firstElementChild as HTMLElement & {
      value: string;
      checkValidity(): boolean;
    };
    expect(control.value).toBe('00:00');
    expect(control.checkValidity()).toBe(true);
  });

  it('e-input-number mirrors native range constraints', () => {
    const form = mount('<form><e-input-number name="v" value="2" min="3"></e-input-number></form>');
    const control = form.firstElementChild as HTMLElement & { checkValidity(): boolean };
    expect(control.checkValidity()).toBe(false);
    control.setAttribute('value', '3');
    expect(control.checkValidity()).toBe(true);
  });

  it('e-input-number updates host validity while the user edits', () => {
    const form = mount(
      '<form><e-input-number name="v" value="1" required></e-input-number></form>',
    );
    const control = form.firstElementChild as HTMLElement & { checkValidity(): boolean };
    const input = control.querySelector('input')!;
    expect(control.checkValidity()).toBe(true);
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(control.checkValidity()).toBe(false);
  });

  it('e-input sanitizes native typed values before form submission', () => {
    const form = mount(
      '<form><e-input name="v" type="number" value="not-a-number" required></e-input></form>',
    );
    const control = form.firstElementChild as HTMLElement & {
      value: string;
      checkValidity(): boolean;
    };
    expect(control.value).toBe('');
    expect(new FormData(form as HTMLFormElement).get('v')).toBe('');
    expect(control.checkValidity()).toBe(false);
  });

  it('a pristine required control is invalid but not marked aria-invalid', () => {
    const form = mount('<form><e-input name="v" required></e-input></form>');
    const control = form.firstElementChild as HTMLElement & { checkValidity(): boolean };
    const input = control.querySelector('input')!;
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(form.checkValidity()).toBe(false);
  });

  it('a required control marks aria-invalid once the user leaves it empty', () => {
    const form = mount('<form><e-input name="v" required></e-input></form>');
    const control = form.firstElementChild as HTMLElement;
    const input = control.querySelector('input')!;
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    control.setAttribute('value', 'Ada');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('reportValidity surfaces a pending required violation', () => {
    const form = mount('<form><e-textarea name="v" required></e-textarea></form>');
    const control = form.firstElementChild as HTMLElement & { reportValidity(): boolean };
    const ta = control.querySelector('textarea')!;
    expect(ta.hasAttribute('aria-invalid')).toBe(false);
    expect(control.reportValidity()).toBe(false);
    expect(ta.getAttribute('aria-invalid')).toBe('true');
  });

  it('an author-set error is marked aria-invalid without any interaction', () => {
    const form = mount('<form><e-input name="v" error error-message="Nope"></e-input></form>');
    const control = form.firstElementChild as HTMLElement & { validationMessage: string };
    expect(control.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(control.validationMessage).toBe('Nope');
  });

  it('required-message overrides the default component message', () => {
    const form = mount(
      '<form><e-checkbox required required-message="Accept the terms"></e-checkbox></form>',
    );
    const control = form.firstElementChild as HTMLElement & {
      validationMessage: string;
    };
    expect(control.validationMessage).toBe('Accept the terms');
  });
});
