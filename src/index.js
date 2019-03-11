export const notify = (event, context, callback) => {
  const obj = {
    a: "success"
  };
  const { a } = obj;
  console.log(a);
  callback(null, `notify() Execution Complete`);
};
