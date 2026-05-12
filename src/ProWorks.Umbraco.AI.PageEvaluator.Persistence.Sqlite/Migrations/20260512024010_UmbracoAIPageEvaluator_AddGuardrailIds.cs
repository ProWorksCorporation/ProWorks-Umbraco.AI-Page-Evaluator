using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddGuardrailIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuardrailIds",
                table: "umbracoAIEvaluatorConfig",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuardrailIds",
                table: "umbracoAIEvaluatorConfig");
        }
    }
}
