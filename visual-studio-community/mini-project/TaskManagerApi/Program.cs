// A small but real REST API - the kind of project you'd actually build and
// debug in Visual Studio, not a toy. It has one genuine, subtle bug left in
// on purpose (see DELETE /tasks/{id}) for you to find using the debugger,
// exactly as described in the README.

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var tasks = new List<TaskItem>
{
    new TaskItem { Id = 1, Title = "Write project proposal", DueDate = DateTime.Today.AddDays(-2), IsComplete = false },
    new TaskItem { Id = 2, Title = "Review pull requests", DueDate = DateTime.Today.AddDays(1), IsComplete = false },
    new TaskItem { Id = 3, Title = "Update dependencies", DueDate = DateTime.Today.AddDays(-1), IsComplete = false },
    new TaskItem { Id = 4, Title = "Deploy to staging", DueDate = DateTime.Today.AddDays(3), IsComplete = false },
};
int nextId = 5;

app.MapGet("/tasks", () => tasks);

app.MapGet("/tasks/{id:int}", (int id) =>
{
    var task = tasks.FirstOrDefault(t => t.Id == id);
    return task is not null ? Results.Ok(task) : Results.NotFound();
});

app.MapGet("/tasks/overdue", () =>
{
    var overdue = tasks.Where(t => !t.IsComplete && t.DueDate < DateTime.Today).ToList();
    return Results.Ok(overdue);
});

app.MapPost("/tasks", (TaskItem newTask) =>
{
    newTask.Id = nextId++;
    tasks.Add(newTask);
    return Results.Created($"/tasks/{newTask.Id}", newTask);
});

app.MapPut("/tasks/{id:int}/complete", (int id) =>
{
    var task = tasks.FirstOrDefault(t => t.Id == id);
    if (task is null) return Results.NotFound();
    task.IsComplete = true;
    return Results.Ok(task);
});

// BUG (intentional - find this using the debugger, see README):
// This assumes the task's Id always equals its position in the list, which
// is true only when nothing has ever been deleted. As soon as one task is
// removed, every later Id no longer matches its index, so this deletes the
// WRONG task or throws ArgumentOutOfRangeException. The fix is to use
// tasks.RemoveAll(t => t.Id == id) instead - but don't fix it until you've
// reproduced and diagnosed it with a breakpoint, per the README steps.
app.MapDelete("/tasks/{id:int}", (int id) =>
{
    tasks.RemoveAt(id);
    return Results.NoContent();
});

app.Run();

class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public DateTime DueDate { get; set; }
    public bool IsComplete { get; set; }
}
