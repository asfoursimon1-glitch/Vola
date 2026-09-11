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
     Anchored to a command boundary so `--node-eval-notes.md` is not a match.

     The backtick in that character class is not decoration. The first version
     of this hook omitted it and waved through `git commit -m "... blocks
     \`node -e\` ..."`, where the backticks were command substitution: the
     shell ran `node -e`, node complained that -e needs an argument, and the
     commit message was stored with that phrase silently deleted. The guard
     was defeated by the thing it guards against, in its own commit. */
  const evalFlag = /(^|[;&|(`]\s*|\$\(\s*|\s)node(\.exe)?\s+(-[ep]\b|--eval\b|--print\b)/;

  /* Which is the narrower lesson. The general one: an unescaped backtick in a
     command is a live substitution, whatever sits inside it, and CLAUDE.md
     names backticks first among the things that have corrupted files here.
     Single-quoting makes them safe, but telling the two cases apart needs a
     shell parser, and a guard that is right most of the time is the kind that
     gets trusted and then bites. `$( )` is left alone: it is deliberate,
     rarely typed by accident, and used legitimately throughout this project. */
  const backtick = /`/;

  /* Any heredoc: <<EOF, <<-EOF, <<'PY', <<"X". The quoted forms are safer in
     principle, but the corruption here came from mixing them up, so the rule
     is one line rather than a subtlety to get right under time pressure. */
  const heredoc = /<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?/;

  const hits = [];
  if (evalFlag.test(command)) hits.push('node -e / -p (shell-quoted evaluation)');
  if (heredoc.test(command)) hits.push('a heredoc');
  if (backtick.test(command)) hits.push('a backtick (command substitution)');
  if (!hits.length) process.exit(0);

  console.error(
    'Blocked. This command uses ' + hits.join(', and ') + ', which CLAUDE.md rules ' +
    'out in this repository.\n\n' +
    'Backticks, $1 and escaped quotes are interpreted by the shell on the way ' +
    'through, and have silently corrupted files here. The failure is quiet: the ' +
    'command reports success and the damage is found later by someone reading a ' +
    'diff. It has already happened to a commit message in this repo, where a ' +
    'backticked phrase was executed and stored as an empty gap.\n\n' +
    'Instead:\n' +
    '  • to create a file, use the Write tool\n' +
    '  • to change one, use the Edit tool\n' +
    '  • to run a script, write it to the scratchpad directory and run it by path\n' +
    '  • in a commit message, write node -e plainly, without the backticks'
  );
  process.exit(2);
});
