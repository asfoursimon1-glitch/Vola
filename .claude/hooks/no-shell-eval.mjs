/* VOLÀ — the guard for the one Bash pattern that has damaged this repo.

   CLAUDE.md asks that `node -e` and heredocs be avoided here: backticks,
   `$1` and `\'` get interpreted by the shell on the way through and have
   silently corrupted files in this project. A request in prose relies on
   whoever is reading it remembering — this makes it something the harness
   enforces, which is the difference between a convention and a rule.

   Blocks rather than warns, because the failure mode is silent: a mangled
   file looks written, the tool reports success, and the corruption is found
   later by someone reading the diff. The Edit and Write tools do the same
   job with none of the quoting, so there is nothing lost by refusing.

   Contract: reads the hook payload on stdin, exit 2 to block with the
   message on stderr, exit 0 to allow. Node because it is the one runtime
   this project already depends on (tools/*.mjs) and it behaves the same on
   Windows and everywhere else — a shell one-liner here would be subject to
   exactly the quoting problem it is meant to prevent. */

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    /* A payload we cannot read is not evidence of wrongdoing. Allowing is
       the safe default for a guard: a broken hook must not become a broken
       session. */
    process.exit(0);
  }

  if (payload.tool_name !== 'Bash') process.exit(0);

  const command = String((payload.tool_input && payload.tool_input.command) || '');

  /* `node -e` / `node --eval`, and `-p`/`--print` which evaluate the same way.
     Anchored to a command boundary so `--node-eval-notes.md` is not a match. */
  const evalFlag = /(^|[;&|(]\s*|\s)node(\.exe)?\s+(-[ep]\b|--eval\b|--print\b)/;

  /* Any heredoc: <<EOF, <<-EOF, <<'PY', <<"X". The quoted forms are safer in
     principle, but the corruption here came from mixing them up, so the rule
     is one line rather than a subtlety to get right under time pressure. */
  const heredoc = /<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?/;

  const hitEval = evalFlag.test(command);
  const hitHeredoc = heredoc.test(command);
  if (!hitEval && !hitHeredoc) process.exit(0);

  const what = hitEval && hitHeredoc ? '`node -e` and a heredoc'
    : hitEval ? '`node -e`'
      : 'a heredoc';

  console.error(
    'Blocked: this command uses ' + what + ', which CLAUDE.md rules out in this ' +
    'repository.\n\n' +
    'Backticks, `$1` and `\\\'` are interpreted by the shell on the way through and ' +
    'have silently corrupted files here before — the write reports success and the ' +
    'damage is found later.\n\n' +
    'Use the Write tool to create a file, or the Edit tool to change one. To run a ' +
    'script, write it to the scratchpad directory first and then run it by path.'
  );
  process.exit(2);
});
