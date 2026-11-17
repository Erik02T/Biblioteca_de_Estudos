// Use the native CLI dialog first: click the icon button, then dialog-accept 🌸
// (or a single space to remove). This script checks storage and a full reload.
async page => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('Isolated frontend required');
  await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  const read = () => page.evaluate(async () => {
    const response = await fetch('http://localhost:3027/areas/' + new URL(location.href).searchParams.get('page'), { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Fixture read ' + response.status);
    return (await response.json()).icone;
  });
  const icon = await read();
  if (icon !== '🌸' && icon !== '') throw Error('Unexpected icon in fixture');
  await page.reload();
  await page.getByRole('button', { name: 'Escolher ícone' }).waitFor();
  if (await read() !== icon) throw Error('Reload lost icon');
  return { chosen: icon === '🌸', removed: icon === '', reopen: true };
}
