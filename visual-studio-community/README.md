# Visual Studio Community

## What it is

Visual Studio Community is Microsoft's free, full-featured IDE for individual developers, students, and open-source contributors (free to use under Microsoft's licensing terms — not open-source itself, but zero-cost and fully-featured, unlike the paid Professional/Enterprise editions which mainly add team/enterprise features). It supports C#/.NET, C++, Python, JavaScript/TypeScript, and more, and is built around one of the most capable debuggers of any mainstream IDE.

- Website: https://visualstudio.microsoft.com/vs/community/
- Docs: https://learn.microsoft.com/visualstudio/

## Why this tool exists / the problem it solves

Lightweight editors (VS Code, Sublime, etc.) are great for quick edits, but real backend/systems development benefits enormously from an IDE that deeply understands your project: full solution-wide IntelliSense, a debugger that can inspect live object state at any point in execution, integrated test runners, and profiling tools — all without configuring anything yourself. Visual Studio Community exists to give individual developers and students that level of tooling for free, where historically this class of IDE (Visual Studio, IntelliJ Ultimate, etc.) was paid-only.

The debugger specifically solves a problem no amount of `Console.WriteLine` really can: understanding *why* a program reached a certain state, by pausing execution and inspecting every variable, the full call stack, and stepping through logic one line at a time — which is exactly what the mini project below will have you do on a real bug.

## Why it matters in the AI era

AI tools can generate a working-looking implementation in seconds, but "looks right" and "is right" are different things — the only way to be sure is to actually run it and watch it behave, especially for logic bugs that don't throw exceptions (wrong results, off-by-one errors, race conditions). A debugger is how you verify AI-generated code instead of trusting it blindly. Visual Studio also has built-in GitHub Copilot integration, so you get AI code suggestions and a serious debugger in the same tool.

## Install

1. Download the installer: https://visualstudio.microsoft.com/vs/community/
2. Run it. In the **Workloads** tab, check **"ASP.NET and web development"** (this also includes ".NET desktop development" components needed for the mini project below).
3. Click Install (this downloads several GB — plan for time on a slow connection).
4. Launch Visual Studio. Sign in with a free Microsoft account when prompted — required to keep using Community edition past the initial trial period, at no cost.

### Verify install
Open **Developer PowerShell for VS** (Start menu, or Tools → Command Line inside VS) and run:
```powershell
dotnet --version
```
You should see a .NET 8 SDK version number.

## Configure

- **Default IntelliSense/debugger behavior** is already sensible out of the box — you generally don't need to touch settings for basic debugging.
- **NuGet package source**: Tools → NuGet Package Manager → Package Manager Settings, confirm `nuget.org` is listed as a package source (it is by default) — this is where `dotnet restore` and Visual Studio pull packages from.
- **launchSettings.json** (included in the mini project, under `Properties/`): controls what URL/port the app runs on and whether a browser auto-launches on debug start. This is a real, commonly-edited config file in any ASP.NET project — worth opening and reading once.

## Core use cases
- Full breakpoint/watch/call-stack debugging of C#/.NET (and C++, Python) applications.
- Building and debugging web APIs (ASP.NET Core), desktop apps, and cloud-integrated apps with built-in Azure tooling.
- Solution-wide refactoring (rename a method and every call site updates safely).
- Git/GitHub workflows built directly into the IDE.
- Performance profiling (CPU usage, memory allocations) via built-in Diagnostic Tools.

## Real-life scenario: finding a real bug in a REST API with the debugger

This mirrors an actual day-in-the-life debugging task: a REST API has an endpoint that behaves incorrectly under a real-world condition, and you need to use the debugger — not guesswork — to find out why.

**What the mini project is:** a small ASP.NET Core minimal API ([mini-project/TaskManagerApi/Program.cs](mini-project/TaskManagerApi/Program.cs)) for managing tasks, with endpoints to list, create, complete, and delete tasks. It has **one real, intentionally-left-in bug** in the delete endpoint that only shows up once you've deleted at least one task — a very realistic class of bug (logic that works fine in the "happy path" demo but breaks on real usage).

### Step 1 — Open and run it
1. In Visual Studio: **File → Open → Project/Solution** → select `TaskManagerApi.csproj`.
2. Press **F5** to build and run with the debugger attached. A browser opens to `/tasks`, showing the seeded task list as JSON.

### Step 2 — Reproduce the bug
Using a REST client (or `curl` from a terminal, or the built-in `.http` file support in VS):
```powershell
curl -X DELETE http://localhost:5080/tasks/1
curl http://localhost:5080/tasks
```
Notice something is wrong: deleting task `1` didn't remove the task titled "Write project proposal" — it removed a *different* task, or if you try deleting an id near the end of the list, you may instead get an unhandled exception (`ArgumentOutOfRangeException`) and a 500 error in the browser. This is the bug you're about to diagnose properly instead of guessing at.

### Step 3 — Set a breakpoint and inspect real state
1. Open `Program.cs`, find the `app.MapDelete("/tasks/{id:int}", ...)` handler.
2. Click in the left margin next to `tasks.RemoveAt(id);` to set a breakpoint (a red dot appears).
3. Press **F5** again if not already running, then send another delete request:
   ```powershell
   curl -X DELETE http://localhost:5080/tasks/2
   ```
4. Execution pauses at your breakpoint. Open the **Locals** window (Debug → Windows → Locals) and expand `tasks` — you can see the *actual current list* at this exact moment, including each item's real `Id` value.
5. Hover over `id` in the code, or add it to the **Watch** window — compare its value to the `Id` property of the item that's actually sitting at index `id` in the list. This is the moment the bug becomes obvious: the code assumes `list index == task Id`, which stops being true the instant any task has ever been deleted, because `RemoveAt` shifts every later element down by one index while their `Id` values stay the same.

### Step 4 — Step through and confirm the fix mentally before writing it
Use **F10 (Step Over)** to execute `RemoveAt(id)` one line at a time and watch the `tasks` list in the Locals window change in real time — you'll watch the wrong item disappear.

### Step 5 — Fix it properly
Replace the buggy line with:
```csharp
tasks.RemoveAll(t => t.Id == id);
```
Rerun the same repro from Step 2 — now the correct task is removed every time, regardless of prior deletions.

## Common pitfalls
- **Forgetting to rebuild**: if you edit code while debugging, Visual Studio will prompt to restart the app — accept it, or your changes won't take effect (this is called "Edit and Continue" when it *can* apply changes live, which works for many but not all edit types).
- **Breakpoint shows as a hollow/grey circle**: usually means the code on that line isn't actually being hit, or the build is out of date — do a Rebuild (Build → Rebuild Solution).
- **Port already in use**: if `localhost:5080` is taken by another process, change `applicationUrl` in `Properties/launchSettings.json`.

## Resources
- Debugging in Visual Studio: https://learn.microsoft.com/visualstudio/debugger/
- ASP.NET Core minimal APIs: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
- .NET docs: https://learn.microsoft.com/dotnet/
