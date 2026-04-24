import {
  Button, Card, CardBody, CardHeader, Divider, Grid, H1, H2,
  IconButton, Pill, Row, Stack, Table, Text, TextInput, Select,
  useCanvasState, useHostTheme,
} from 'cursor/canvas';

interface Team { id: string; name: string; group: string; }
interface GroupMatch { id: string; group: string; homeId: string; awayId: string; homeScore: number | null; awayScore: number | null; }
interface KnockoutMatch { id: string; round: string; slot: number; team1Id: string | null; team2Id: string | null; score1: number | null; score2: number | null; winnerId: string | null; }

export default function FootballTournament() {
  const { tokens } = useHostTheme();

  const [tab, setTab] = useCanvasState<string>('tab', 'setup');
  const [tournName, setTournName] = useCanvasState<string>('tournName', '足球杯赛 2026');
  const [teams, setTeams] = useCanvasState<Team[]>('teams', []);
  const [gMatches, setGMatches] = useCanvasState<GroupMatch[]>('gMatches', []);
  const [koMatches, setKoMatches] = useCanvasState<KnockoutMatch[]>('koMatches', []);
  const [newName, setNewName] = useCanvasState<string>('newName', '');
  const [newGroup, setNewGroup] = useCanvasState<string>('newGroup', 'A');
  const [gEditId, setGEditId] = useCanvasState<string | null>('gEditId', null);
  const [kEditId, setKEditId] = useCanvasState<string | null>('kEditId', null);
  const [es1, setEs1] = useCanvasState<string>('es1', '');
  const [es2, setEs2] = useCanvasState<string>('es2', '');

  const groups = [...new Set(teams.map(t => t.group))].sort();
  const byId = (id: string | null | undefined) => teams.find(t => t.id === id);

  function addTeam() {
    if (!newName.trim()) return;
    setTeams(prev => [...prev, { id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`, name: newName.trim(), group: newGroup }]);
    setNewName('');
  }

  function removeTeam(id: string) {
    setTeams(prev => prev.filter(t => t.id !== id));
    setGMatches(prev => prev.filter(m => m.homeId !== id && m.awayId !== id));
  }

  function genGroupMatches() {
    const result: GroupMatch[] = [];
    for (const g of groups) {
      const gt = teams.filter(t => t.group === g);
      for (let i = 0; i < gt.length; i++) {
        for (let j = i + 1; j < gt.length; j++) {
          const ex = gMatches.find(m =>
            m.group === g &&
            ((m.homeId === gt[i].id && m.awayId === gt[j].id) ||
             (m.homeId === gt[j].id && m.awayId === gt[i].id))
          );
          result.push(ex ?? {
            id: `gm${Date.now()}${i}${j}${Math.random().toString(36).slice(2, 5)}`,
            group: g, homeId: gt[i].id, awayId: gt[j].id, homeScore: null, awayScore: null,
          });
        }
      }
    }
    setGMatches(result);
  }

  function computeStandings(g: string) {
    const gt = teams.filter(t => t.group === g);
    const r: Record<string, { teamId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};
    for (const t of gt) r[t.id] = { teamId: t.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    for (const m of gMatches.filter(m => m.group === g && m.homeScore !== null)) {
      if (!r[m.homeId] || !r[m.awayId]) continue;
      const h = m.homeScore!, a = m.awayScore!;
      r[m.homeId].p++; r[m.awayId].p++;
      r[m.homeId].gf += h; r[m.homeId].ga += a;
      r[m.awayId].gf += a; r[m.awayId].ga += h;
      if (h > a) { r[m.homeId].w++; r[m.homeId].pts += 3; r[m.awayId].l++; }
      else if (h < a) { r[m.awayId].w++; r[m.awayId].pts += 3; r[m.homeId].l++; }
      else { r[m.homeId].d++; r[m.homeId].pts++; r[m.awayId].d++; r[m.awayId].pts++; }
    }
    return Object.values(r)
      .map(x => ({ ...x, gd: x.gf - x.ga }))
      .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }

  function genKnockout() {
    const firsts: string[] = [], seconds: string[] = [];
    for (const g of groups) {
      const s = computeStandings(g);
      if (s[0]) firsts.push(s[0].teamId);
      if (s[1]) seconds.push(s[1].teamId);
    }
    const n = Math.min(firsts.length, seconds.length);
    const km: KnockoutMatch[] = [];
    for (let i = 0; i < n; i++) {
      km.push({ id: `ko_r1_${i}`, round: 'r1', slot: i, team1Id: firsts[i], team2Id: seconds[n - 1 - i], score1: null, score2: null, winnerId: null });
    }
    let sz = Math.floor(n / 2), r = 2;
    while (sz >= 1) {
      for (let i = 0; i < sz; i++) {
        km.push({ id: `ko_r${r}_${i}`, round: `r${r}`, slot: i, team1Id: null, team2Id: null, score1: null, score2: null, winnerId: null });
      }
      sz = Math.floor(sz / 2); r++;
    }
    setKoMatches(km);
  }

  function saveGScore(id: string) {
    const h = parseInt(es1), a = parseInt(es2);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setGMatches(prev => prev.map(m => m.id === id ? { ...m, homeScore: h, awayScore: a } : m));
    setGEditId(null); setEs1(''); setEs2('');
  }

  function saveKScore(id: string) {
    const s1 = parseInt(es1), s2 = parseInt(es2);
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 === s2) return;
    const match = koMatches.find(m => m.id === id);
    if (!match) return;
    const winnerId = s1 > s2 ? match.team1Id : match.team2Id;
    let updated = koMatches.map(m => m.id === id ? { ...m, score1: s1, score2: s2, winnerId } : m);
    const nextR = `r${parseInt(match.round.slice(1)) + 1}`;
    const nextSlot = Math.floor(match.slot / 2);
    const idx = updated.findIndex(m => m.round === nextR && m.slot === nextSlot);
    if (idx >= 0) updated[idx] = { ...updated[idx], [match.slot % 2 === 0 ? 'team1Id' : 'team2Id']: winnerId };
    setKoMatches(updated);
    setKEditId(null); setEs1(''); setEs2('');
  }

  function cancelEdit() { setGEditId(null); setKEditId(null); setEs1(''); setEs2(''); }

  const koRounds = [...new Set(koMatches.map(m => m.round))].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
  const totalR = koRounds.length;

  function roundLabel(r: string) {
    const n = parseInt(r.slice(1));
    if (n === totalR) return '决赛';
    if (n === totalR - 1) return '半决赛';
    if (n === totalR - 2) return '四分之一决赛';
    return `第 ${n} 轮`;
  }

  const groupOpts = 'ABCDEFGH'.split('').map(g => ({ value: g, label: `${g} 组` }));
  const tabs = [
    { key: 'setup', label: '设置' },
    { key: 'standings', label: '积分榜' },
    { key: 'scores', label: '比分录入' },
    { key: 'knockout', label: '淘汰赛' },
  ];

  const rowBorder = `1px solid ${tokens.stroke.tertiary}`;

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 960 }}>
      <H1>{tournName}</H1>

      <Row gap={6} wrap>
        {tabs.map(({ key, label }) => (
          <Pill key={key} active={tab === key} onClick={() => setTab(key)}>{label}</Pill>
        ))}
      </Row>

      <Divider />

      {/* ── 设置 ───────────────────────────────────────────────── */}
      {tab === 'setup' && (
        <Stack gap={20}>
          <Row gap={8} align="center">
            <Text weight="semibold" style={{ minWidth: 72 }}>赛事名称</Text>
            <TextInput value={tournName} onChange={setTournName} placeholder="赛事名称" style={{ width: 240 }} />
          </Row>

          <Divider />
          <H2>球队管理</H2>

          <Row gap={8} align="center">
            <TextInput value={newName} onChange={setNewName} placeholder="输入球队名称" style={{ width: 200 }} />
            <Select value={newGroup} onChange={setNewGroup} options={groupOpts} style={{ width: 110 }} />
            <Button variant="primary" onClick={addTeam}>添加球队</Button>
          </Row>

          {groups.length > 0 && (
            <Grid columns={Math.min(groups.length, 4)} gap={12}>
              {groups.map(g => {
                const gt = teams.filter(t => t.group === g);
                return (
                  <Card key={g}>
                    <CardHeader trailing={<Text size="small" tone="secondary">{gt.length} 队</Text>}>{g} 组</CardHeader>
                    <CardBody>
                      <Stack gap={6}>
                        {gt.map(tm => (
                          <Row key={tm.id} gap={8} align="center">
                            <Text style={{ flex: 1 }} truncate>{tm.name}</Text>
                            <IconButton title="移除" size="sm" onClick={() => removeTeam(tm.id)}>✕</IconButton>
                          </Row>
                        ))}
                        {gt.length === 0 && <Text tone="tertiary" size="small">暂无球队</Text>}
                      </Stack>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>
          )}

          {teams.length === 0 && (
            <Text tone="secondary" size="small">请选择分组并添加球队，每组至少 2 支才能生成赛程。</Text>
          )}

          {teams.length >= 2 && (
            <Row>
              <Button variant="secondary" onClick={genGroupMatches}>生成 / 更新小组赛程</Button>
            </Row>
          )}
        </Stack>
      )}

      {/* ── 积分榜 ────────────────────────────────────────────── */}
      {tab === 'standings' && (
        <Stack gap={28}>
          {groups.length === 0 && <Text tone="secondary">请先在"设置"中添加球队。</Text>}
          {groups.map(g => {
            const s = computeStandings(g);
            return (
              <Stack key={g} gap={10}>
                <H2>{g} 组积分榜</H2>
                <Table
                  headers={['', '球队', '场', '胜', '平', '负', '进球', '失球', '净胜球', '积分']}
                  columnAlign={['center', 'left', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center']}
                  striped
                  emptyMessage="暂无数据"
                  rows={s.map((row, idx) => {
                    const tm = byId(row.teamId);
                    return [
                      idx < 2
                        ? <Pill key="q" size="sm" tone="success" active>晋级</Pill>
                        : <Text key="n" tone="tertiary" size="small">{idx + 1}</Text>,
                      <Text key="nm" weight={idx < 2 ? 'semibold' : 'normal'}>{tm?.name ?? '-'}</Text>,
                      row.p, row.w, row.d, row.l, row.gf, row.ga,
                      <Text key="gd" tone={row.gd > 0 ? 'primary' : row.gd < 0 ? 'secondary' : 'tertiary'}>
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </Text>,
                      <Text key="pts" weight="bold">{row.pts}</Text>,
                    ];
                  })}
                />
              </Stack>
            );
          })}
        </Stack>
      )}

      {/* ── 比分录入 ──────────────────────────────────────────── */}
      {tab === 'scores' && (
        <Stack gap={28}>
          {groups.length === 0 && <Text tone="secondary">请先在"设置"中添加球队。</Text>}
          {groups.map(g => {
            const ms = gMatches.filter(m => m.group === g);
            const played = ms.filter(m => m.homeScore !== null).length;
            return (
              <Stack key={g} gap={10}>
                <Row gap={10} align="center">
                  <H2>{g} 组赛程</H2>
                  {ms.length > 0 && (
                    <Text tone="secondary" size="small">{played}/{ms.length} 场已录入</Text>
                  )}
                </Row>
                {ms.length === 0 && <Text tone="tertiary" size="small">请先在"设置"中生成赛程。</Text>}
                <Stack gap={0}>
                  {ms.map(match => {
                    const home = byId(match.homeId);
                    const away = byId(match.awayId);
                    const isEditing = gEditId === match.id;
                    const isPlayed = match.homeScore !== null;
                    const homeWon = isPlayed && match.homeScore! > match.awayScore!;
                    const awayWon = isPlayed && match.awayScore! > match.homeScore!;
                    return (
                      <Row key={match.id} gap={8} align="center" style={{ padding: '10px 8px', borderBottom: rowBorder }}>
                        <Text style={{ width: 180, textAlign: 'right' }} weight={homeWon ? 'semibold' : 'normal'}>
                          {home?.name ?? '-'}
                        </Text>
                        {isEditing ? (
                          <Row gap={4} align="center">
                            <TextInput type="number" value={es1} onChange={setEs1} style={{ width: 50 }} />
                            <Text tone="secondary" weight="semibold">:</Text>
                            <TextInput type="number" value={es2} onChange={setEs2} style={{ width: 50 }} />
                            <Button variant="primary" onClick={() => saveGScore(match.id)}>确认</Button>
                            <Button variant="ghost" onClick={cancelEdit}>取消</Button>
                          </Row>
                        ) : (
                          <Row gap={8} align="center">
                            <Text style={{ minWidth: 76, textAlign: 'center' }} weight="semibold" tone={isPlayed ? 'primary' : 'tertiary'}>
                              {isPlayed ? `${match.homeScore}  :  ${match.awayScore}` : 'vs'}
                            </Text>
                            <Button variant="ghost" onClick={() => {
                              setGEditId(match.id);
                              setEs1(match.homeScore !== null ? String(match.homeScore) : '');
                              setEs2(match.awayScore !== null ? String(match.awayScore) : '');
                            }}>
                              {isPlayed ? '修改' : '录入'}
                            </Button>
                          </Row>
                        )}
                        <Text style={{ width: 180 }} weight={awayWon ? 'semibold' : 'normal'}>
                          {away?.name ?? '-'}
                        </Text>
                      </Row>
                    );
                  })}
                </Stack>
              </Stack>
            );
          })}

          {groups.length > 0 && (
            <Row style={{ paddingTop: 8 }}>
              <Button variant="secondary" onClick={genKnockout}>根据积分榜生成淘汰赛</Button>
            </Row>
          )}
        </Stack>
      )}

      {/* ── 淘汰赛 ────────────────────────────────────────────── */}
      {tab === 'knockout' && (
        <Stack gap={28}>
          {koMatches.length === 0 ? (
            <Stack gap={8}>
              <Text tone="secondary">请先完成小组赛比分录入，然后点击"比分录入"页底部的"根据积分榜生成淘汰赛"。</Text>
              <Text tone="tertiary" size="small">每组积分榜前 2 名晋级淘汰赛，淘汰赛单场决出胜负（不接受平局）。</Text>
            </Stack>
          ) : (
            <>
              {(() => {
                const fin = koMatches.find(m => m.round === koRounds[totalR - 1]);
                const champ = fin?.winnerId ? byId(fin.winnerId) : null;
                if (!champ) return null;
                return (
                  <Card key="champion">
                    <CardHeader trailing={<Pill size="sm" tone="success" active>冠军</Pill>}>本届赛事冠军</CardHeader>
                    <CardBody>
                      <Text weight="bold" style={{ fontSize: 18 }}>{champ.name}</Text>
                    </CardBody>
                  </Card>
                );
              })()}

              {koRounds.map(round => {
                const roundMatches = koMatches.filter(m => m.round === round);
                const doneCount = roundMatches.filter(m => m.score1 !== null).length;
                return (
                  <Stack key={round} gap={10}>
                    <Row gap={10} align="center">
                      <H2>{roundLabel(round)}</H2>
                      <Text tone="secondary" size="small">{doneCount}/{roundMatches.length} 场</Text>
                    </Row>
                    <Stack gap={0}>
                      {roundMatches.map(match => {
                        const t1 = byId(match.team1Id);
                        const t2 = byId(match.team2Id);
                        const isEditing = kEditId === match.id;
                        const isPlayed = match.score1 !== null;
                        const t1Won = match.winnerId === match.team1Id;
                        const t2Won = match.winnerId === match.team2Id;
                        return (
                          <Row key={match.id} gap={8} align="center" style={{ padding: '10px 8px', borderBottom: rowBorder }}>
                            <Text
                              style={{ width: 180, textAlign: 'right' }}
                              weight={t1Won ? 'semibold' : 'normal'}
                              tone={!t1 ? 'tertiary' : 'primary'}
                            >
                              {t1?.name ?? '待定'}
                            </Text>
                            {isEditing ? (
                              <Row gap={4} align="center">
                                <TextInput type="number" value={es1} onChange={setEs1} style={{ width: 50 }} />
                                <Text tone="secondary" weight="semibold">:</Text>
                                <TextInput type="number" value={es2} onChange={setEs2} style={{ width: 50 }} />
                                <Button variant="primary" onClick={() => saveKScore(match.id)}>确认</Button>
                                <Button variant="ghost" onClick={cancelEdit}>取消</Button>
                              </Row>
                            ) : (
                              <Row gap={8} align="center">
                                <Text style={{ minWidth: 76, textAlign: 'center' }} weight="semibold" tone={isPlayed ? 'primary' : 'tertiary'}>
                                  {isPlayed ? `${match.score1}  :  ${match.score2}` : 'vs'}
                                </Text>
                                {t1 && t2 && (
                                  <Button variant="ghost" onClick={() => {
                                    setKEditId(match.id);
                                    setEs1(match.score1 !== null ? String(match.score1) : '');
                                    setEs2(match.score2 !== null ? String(match.score2) : '');
                                  }}>
                                    {isPlayed ? '修改' : '录入'}
                                  </Button>
                                )}
                              </Row>
                            )}
                            <Text
                              style={{ width: 180 }}
                              weight={t2Won ? 'semibold' : 'normal'}
                              tone={!t2 ? 'tertiary' : 'primary'}
                            >
                              {t2?.name ?? '待定'}
                            </Text>
                          </Row>
                        );
                      })}
                    </Stack>
                  </Stack>
                );
              })}
            </>
          )}
        </Stack>
      )}
    </Stack>
  );
}
