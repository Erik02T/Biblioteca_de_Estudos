async (page) => {
  const { api, web, account } = __F12_SETTINGS__;
  if (new URL(page.url()).origin !== web) await page.goto(web);
  const response = await page.request.post(api + '/auth/login', { data: { email: account.email, password: account.password } });
  if (!response.ok()) return { passed: false, failure: 'Fixture login ' + response.status() };
  const tokens = await response.json();
  await page.evaluate(tokens => { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); }, tokens);
  await page.goto(web);
  return { passed: true, restoredFixtureAccount: true };
}
