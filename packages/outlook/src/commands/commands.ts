export {};

Office.onReady(() => {
  Office.actions.associate('showTaskpane', showTaskpane);
});

function showTaskpane(_event: Office.AddinCommands.Event) {
  Office.context.ui.displayDialogAsync(
    `${window.location.origin}/taskpane.html`,
    { height: 60, width: 30 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open task pane:', result.error.message);
      }
    }
  );
}

declare global {
  interface Window {
    showTaskpane: typeof showTaskpane;
  }
}

window.showTaskpane = showTaskpane;
