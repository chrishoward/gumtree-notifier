export const notify = (event, context, callback) => {
  console.log("success");
  callback(null, `notify() Execution Complete`);
};
