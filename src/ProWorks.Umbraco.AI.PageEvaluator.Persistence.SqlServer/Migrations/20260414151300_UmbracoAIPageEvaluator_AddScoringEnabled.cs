using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddScoringEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ScoringEnabled",
                table: "umbracoAIEvaluatorConfig",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScoringEnabled",
                table: "umbracoAIEvaluatorConfig");
        }
    }
}
