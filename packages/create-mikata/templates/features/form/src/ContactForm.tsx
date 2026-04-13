import { createForm } from 'mikata';
/* @if:ui */
import { Button, Card, Stack, TextInput, Title } from '@mikata/ui';
/* @endif */

interface Values {
  name: string;
  email: string;
}

export function ContactForm() {
  const form = createForm<Values>({
    initialValues: { name: '', email: '' },
    validate: {
      name: (v) => (v.length > 0 ? null : 'Name is required'),
      email: (v) => (/^.+@.+\..+$/.test(v) ? null : 'Enter a valid email'),
    },
  });

  const onSubmit = form.onSubmit((values) => {
    alert(`Hello ${values.name}! We'll reach out to ${values.email}.`);
  });

  /* @if:ui */
  return (
    <Card>
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Title order={3}>Contact</Title>
          <TextInput label="Name" {...form.getInputProps('name')} />
          <TextInput label="Email" type="email" {...form.getInputProps('email')} />
          <Button type="submit">Send</Button>
        </Stack>
      </form>
    </Card>
  );
  /* @endif */
  /* @if:!ui */
  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
      <h3>Contact</h3>
      <label>
        Name
        <input {...form.getInputProps('name')} />
      </label>
      {form.errors().name && <span style={{ color: 'red' }}>{form.errors().name}</span>}
      <label>
        Email
        <input type="email" {...form.getInputProps('email')} />
      </label>
      {form.errors().email && <span style={{ color: 'red' }}>{form.errors().email}</span>}
      <button type="submit">Send</button>
    </form>
  );
  /* @endif */
}
