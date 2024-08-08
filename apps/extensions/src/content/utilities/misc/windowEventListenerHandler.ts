export const windowEventListenerHandler = (
  events: any[],
  eventFunctions: any[],
  removeListeners = false,
) => {
  if (events.length !== eventFunctions.length)
    return console.error(
      'Events and event functions have different length.',
      events,
      eventFunctions,
    );

  if (removeListeners) {
    events.forEach((event, index: number) =>
      window.removeEventListener(event, eventFunctions[index]),
    );
    return;
  }

  events.forEach((event, index: number) =>
    window.addEventListener(event, eventFunctions[index]),
  );
};
