using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddCacheSourceAndDeployManaged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeployManaged",
                table: "umbracoAIEvaluatorConfig",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SourceUpdateDate",
                table: "umbracoAIEvaluationCache",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDeployManaged",
                table: "umbracoAIEvaluatorConfig");

            migrationBuilder.DropColumn(
                name: "SourceUpdateDate",
                table: "umbracoAIEvaluationCache");
        }
    }
}
